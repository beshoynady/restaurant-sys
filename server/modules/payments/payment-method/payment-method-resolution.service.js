// Enterprise Payment Platform V1 Phase 2 — Payment Method Resolution Engine.
//
// The question this file answers: "the cashier picked 'Visa' — what, concretely, executes this
// payment?" Before this file existed, `PaymentMethod.type/reference` could only ever mean "the one
// fixed CashRegister or PaymentProvider this method always points at" — no priority, no branch
// override, no fallback if the primary provider is unavailable. This is the orchestration layer
// that was missing, built as a resolver-per-type Strategy registry (not a growing if/else) so a
// future PaymentMethod.type value plugs in as one new entry here, never a rewrite of this function.
import PaymentMethodModel from "./payment-method.model.js";
import PaymentProviderModel from "../payment-provider/payment-provider.model.js";
import paymentProviderMappingService from "../payment-provider-mapping/payment-provider-mapping.service.js";
import merchantAccountService from "../merchant-account/merchant-account.service.js";

/**
 * Cash resolves to whichever register the CALLER'S own context says is in use (the cashier's
 * currently-open shift/register) — `method.reference` is only a fallback for a caller that has no
 * register context of its own (e.g. a back-office reconciliation entry), never an override of a
 * real in-progress cashier session. Getting this backwards would let a stale, brand-level "default
 * register" configuration silently redirect cash that a specific cashier's own drawer should own.
 */
async function resolveCashRegister({ method, cashRegister }) {
  const target = cashRegister || method.reference;
  if (!target) {
    return { resolutionType: "UNRESOLVED", reason: "No cash register available — neither the caller's context nor the payment method's own default is set." };
  }
  return { resolutionType: "CASH_REGISTER", paymentMethod: method._id, cashRegister: target };
}

/**
 * Walks the ranked candidate providers (PaymentProviderMapping if any were configured for this
 * method, else falling back to the method's own single `reference` pointer — Phase 1's original,
 * still-correct behavior for a method nobody has bothered to configure fallback for yet) and
 * returns the first one that both (a) is actually usable right now (active, not archived, allows
 * this channel) and (b) has a real, eligible MerchantAccount behind it. This is the actual
 * automatic-failover the mission asked for: a Provider being temporarily disabled or having no
 * account configured for this specific branch doesn't fail the payment, it just tries the next
 * ranked candidate.
 */
async function resolvePaymentProvider({ brand, branch, channel, cashRegister, method }) {
  const rankedMappings = await paymentProviderMappingService.getRankedProviders(brand, branch, method._id);
  const candidateProviderIds = rankedMappings.length > 0
    ? rankedMappings.map((m) => m.provider)
    : [method.reference]; // no explicit mapping configured -> Phase 1's original single-pointer behavior

  for (const providerId of candidateProviderIds) {
    if (!providerId) continue;

    const provider = await PaymentProviderModel.findOne({
      _id: providerId, brand, $or: [{ branch: null }, { branch }],
      isActive: true, isArchived: false, isDeleted: false,
    }).lean();
    if (!provider) continue; // this candidate isn't usable right now — try the next-ranked one, don't fail the whole resolution

    // A channel-restricted provider can only be chosen when the caller actually told us which
    // channel this payment came through — silently allowing it when the channel is unknown would
    // defeat the restriction's whole purpose.
    if (provider.allowedChannels?.length) {
      if (!channel || !provider.allowedChannels.includes(channel)) continue;
    }

    const merchantAccount = await merchantAccountService.resolveAccount({
      brand, providerId: provider._id, branch, cashRegister, channel,
    });
    if (!merchantAccount) continue; // provider is enabled but has no eligible account for this branch/register/channel — keep falling back

    return {
      resolutionType: "PAYMENT_PROVIDER",
      paymentMethod: method._id,
      provider,
      merchantAccount: merchantAccountService.toSafeJSON(merchantAccount),
    };
  }

  return { resolutionType: "UNRESOLVED", reason: "No active provider with an eligible merchant account could be resolved for this method/branch/channel." };
}

// The Strategy registry itself — `PaymentMethod.type` is the key, matching the exact same
// discriminator the schema's own `refPath` already uses. Business categories with no real backing
// engine yet (Wallet/GiftCard/Loyalty/Corporate Billing — none of which have a real ledger
// anywhere in this codebase, confirmed during the original platform audit) are NOT given a fake
// resolver here; PaymentMethod.type only has two real values today, and pretending a third exists
// would be exactly the kind of placeholder this platform's own standing rules forbid.
const RESOLVERS = {
  CashRegister: resolveCashRegister,
  PaymentProvider: resolvePaymentProvider,
};

class PaymentMethodResolutionService {
  /**
   * @param {object} params
   * @param {string} params.brand
   * @param {string|null} params.branch
   * @param {string|null} params.channel - one of PaymentProvider's allowedChannels enum values
   * @param {string|null} params.cashRegister
   * @param {string} params.paymentMethodId
   * @returns {Promise<{resolutionType: "CASH_REGISTER"|"PAYMENT_PROVIDER"|"UNRESOLVED"|"UNSUPPORTED", ...}>}
   */
  async resolve({ brand, branch = null, channel = null, cashRegister = null, paymentMethodId }) {
    const method = await PaymentMethodModel.findOne({
      _id: paymentMethodId, brand, isActive: true, isDeleted: false,
    }).lean();
    if (!method) {
      return { resolutionType: "UNRESOLVED", reason: "Payment method not found, inactive, or deleted." };
    }

    const resolver = RESOLVERS[method.type];
    if (!resolver) {
      // Fails closed and says exactly why, rather than a generic 500 — an admin who somehow
      // configured a PaymentMethod.type value this engine doesn't know needs to see precisely
      // that, not guess from a stack trace.
      return { resolutionType: "UNSUPPORTED", reason: `PaymentMethod.type "${method.type}" has no resolution strategy registered.` };
    }

    return resolver({ brand, branch, channel, cashRegister, method });
  }
}

export default new PaymentMethodResolutionService();
