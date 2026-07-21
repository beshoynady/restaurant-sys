import MerchantAccountModel from "./merchant-account.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import PaymentProviderModel from "../payment-provider/payment-provider.model.js";
import PaymentGatewayModel from "../payment-gateway/payment-gateway.model.js";
import { encryptSecret, decryptSecret, maskSecret } from "../../../utils/secretEncryption.js";

class MerchantAccountService extends AdvancedService {
  constructor() {
    super(MerchantAccountModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "provider", "allowedBranches", "allowedCashRegisters", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { priority: 1, createdAt: -1 },
      // A generic PUT must never be able to silently flip which provider a live account belongs
      // to, or bypass the encryption pipeline by writing directly to the stored credential shape —
      // both go through dedicated logic in beforeCreate/beforeUpdate/rotateCredential instead.
      lockedUpdateFields: ["brand", "provider", "credentialValues", "secretCredentials", "lastVerifiedAt", "lastVerificationStatus"],
    });
  }

  /**
   * Splits a caller-submitted flat `{key: value}` credentials object into the two stored shapes
   * (plain `credentialValues` Map, individually-encrypted `secretCredentials` array), validated
   * against the account's own Provider -> Gateway `credentialSchema`. This is the single place
   * this platform ever encrypts a payment credential — every create/update path funnels through
   * here, never through a raw model write, so there's exactly one place to audit for correctness.
   */
  async _processCredentials(providerId, rawCredentials = {}) {
    const provider = await PaymentProviderModel.findById(providerId).select("gateway").lean();
    if (!provider) throwError("Payment provider not found.", 404);
    const gateway = await PaymentGatewayModel.findById(provider.gateway).select("credentialSchema").lean();
    if (!gateway) throwError("Payment gateway not found for this provider.", 404);

    const credentialValues = {};
    const secretCredentials = [];

    for (const field of gateway.credentialSchema || []) {
      const value = rawCredentials[field.key];
      if (field.required && (value === undefined || value === null || value === "")) {
        throwError(`Missing required credential field "${field.key}" for this gateway.`, 400);
      }
      if (value === undefined || value === null || value === "") continue;

      if (field.secret) {
        secretCredentials.push({ key: field.key, ...encryptSecret(value) });
      } else {
        credentialValues[field.key] = value;
      }
    }

    return { credentialValues, secretCredentials };
  }

  async beforeCreate(data) {
    const { credentials, ...rest } = data;
    const { credentialValues, secretCredentials } = await this._processCredentials(rest.provider, credentials);
    return { ...rest, credentialValues, secretCredentials };
  }

  async beforeUpdate(data) {
    const { credentials, ...rest } = data;
    // Credentials are optional on update — an admin changing the display name shouldn't be forced
    // to resubmit every secret. Only re-run the encryption pipeline when new values were actually
    // submitted.
    if (credentials && rest.provider) {
      const { credentialValues, secretCredentials } = await this._processCredentials(rest.provider, credentials);
      return { ...rest, credentialValues, secretCredentials };
    }
    return rest;
  }

  /**
   * Decrypts one named secret field for an outbound provider API call. This is the ONLY method in
   * this service that ever returns a real, usable secret — every other read path (getOne/getAll,
   * the generic controller) returns the masked view instead. Called in-process, at the moment of
   * making a gateway call; the decrypted value must never be logged, returned in an HTTP response,
   * or included in a webhook/event payload.
   */
  async getDecryptedSecret(accountId, key) {
    const account = await this.model.findById(accountId).select("secretCredentials").lean();
    if (!account) throwError("Merchant account not found.", 404);
    const entry = account.secretCredentials.find((s) => s.key === key);
    if (!entry) return null;
    return decryptSecret(entry);
  }

  /**
   * The safe, API-facing view of a MerchantAccount — every secret is masked, never decrypted.
   * `AdvancedService`'s generic getOne/getAll return raw Mongoose documents; controllers for this
   * module call this explicitly instead so secrets can never leak through the generic path by
   * accident (a defense-in-depth measure, not a replacement for the field being encrypted at rest
   * in the first place).
   */
  toSafeJSON(account) {
    const plain = account.toObject ? account.toObject() : account;
    return {
      ...plain,
      secretCredentials: (plain.secretCredentials || []).map((s) => ({
        key: s.key,
        masked: maskSecret(decryptSecret(s)),
      })),
    };
  }

  /**
   * Resolves the actual MerchantAccount a payment should execute against — the last step of the
   * Global -> Brand -> Branch -> Channel -> Register resolution chain (§5.3 of the Engineering
   * Review). Fails closed: returns `null` rather than guessing, matching this platform's
   * established convention for financial-routing configuration (SalesReturnSettings does the
   * same) — inventing a default merchant account would be a business decision this method has no
   * authority to make.
   */
  async resolveAccount({ brand, providerId, branch = null, cashRegister = null, channel = null }) {
    const filter = {
      brand,
      provider: providerId,
      isActive: true,
      isArchived: false,
      isDeleted: false,
    };
    const candidates = await this.model.find(filter).sort({ priority: 1 }).lean();

    const eligible = candidates.filter((acc) => {
      const branchOk = !acc.allowedBranches?.length || (branch && acc.allowedBranches.some((b) => String(b) === String(branch)));
      const registerOk = !acc.allowedCashRegisters?.length || (cashRegister && acc.allowedCashRegisters.some((r) => String(r) === String(cashRegister)));
      const channelOk = !acc.allowedChannels?.length || (channel && acc.allowedChannels.includes(channel));
      return branchOk && registerOk && channelOk;
    });

    return eligible[0] || null;
  }
}

export default new MerchantAccountService();
