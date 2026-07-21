// Enterprise Payment Platform V1 — PaymentGateway / PaymentProvider / MerchantAccount.
// Verifies: a Gateway's global-vs-brand catalog visibility; a Provider can only be created
// against a Gateway visible to its own brand; branch-specific Providers are resolved ahead of
// brand-wide ones; a MerchantAccount's credentials are validated against its Gateway's own
// credentialSchema, encrypted at rest (never stored in plaintext), and never returned decrypted
// through the safe-JSON view; resolveAccount() correctly applies branch/register/channel
// restrictions and priority ordering; the generic PUT path can never bypass the encryption
// pipeline by writing directly to the stored credential fields.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createAccountFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import PaymentGatewayModel from "../../modules/payments/payment-gateway/payment-gateway.model.js";
import paymentGatewayService from "../../modules/payments/payment-gateway/payment-gateway.service.js";
import PaymentProviderModel from "../../modules/payments/payment-provider/payment-provider.model.js";
import paymentProviderService from "../../modules/payments/payment-provider/payment-provider.service.js";
import MerchantAccountModel from "../../modules/payments/merchant-account/merchant-account.model.js";
import merchantAccountService from "../../modules/payments/merchant-account/merchant-account.service.js";
import { decryptSecret } from "../../utils/secretEncryption.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";

// Deterministic 32-byte key for this test process only — production keys are real, per-environment
// secrets never checked into source; this is exactly what utils/secretEncryption.js's own comment
// says a real deployment must generate once and never commit.
process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = "a".repeat(64);

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Payment Platform V1: Gateway / Provider / MerchantAccount", () => {
  let fixture: TestFixture;
  let secondBranchId: mongoose.Types.ObjectId;
  let cashRegisterId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`epp-${runTag}`);

    const secondBranch = await BranchModel.create({
      brand: fixture.brandId, name: new Map([["en", `EPP Branch 2 ${runTag}`]]), slug: `epp-b2-${runTag}`.toLowerCase(),
    });
    secondBranchId = secondBranch._id;

    const registerAccount = await createAccountFixture(fixture, `EPPREG-${runTag}`, "Asset");
    // type: "SAFE" (not "POS") — no `employee` field required, and this test only needs the
    // register to exist as a referenceable ID, not to model a real cashier drawer.
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Test Register"]]),
      code: `REG-${runTag}`, type: "SAFE", accountId: registerAccount._id, currency: "EGP", createdBy: fixture.userId,
    });
    cashRegisterId = register._id;
  });

  afterAll(async () => {
    await Promise.all([
      MerchantAccountModel.deleteMany({ brand: fixture.brandId }),
      PaymentProviderModel.deleteMany({ brand: fixture.brandId }),
      PaymentGatewayModel.deleteMany({ brand: { $in: [null, fixture.brandId] }, code: { $regex: `^EPPTEST` } }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createTestGateway(overrides: Record<string, unknown> = {}) {
    return paymentGatewayService.create({
      brandId: overrides.brand ?? null,
      createdBy: fixture.userId,
      data: {
        code: `EPPTEST_GW_${runTag}_${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        name: new Map([["en", "Test Gateway"]]),
        capabilities: ["REFUND", "PARTIAL_REFUND", "WEBHOOK"],
        integrationModes: ["API", "HOSTED_PAYMENT"],
        credentialSchema: [
          { key: "apiKey", label: new Map([["en", "API Key"]]), type: "secret", required: true, secret: true },
          { key: "merchantId", label: new Map([["en", "Merchant ID"]]), type: "text", required: true, secret: false },
          { key: "webhookSecret", label: new Map([["en", "Webhook Secret"]]), type: "secret", required: false, secret: true },
        ],
        ...overrides,
      },
    });
  }

  it("PaymentGateway.listAvailable returns the global catalog plus this brand's own entries, not a foreign brand's", async () => {
    const globalGateway = await createTestGateway({ brand: null });
    const ownGateway = await createTestGateway({ brand: fixture.brandId });

    const foreignFixture = await createBaseFixture(`epp-foreign-${runTag}`);
    const foreignGateway = await createTestGateway({ brand: foreignFixture.brandId });

    const available = await paymentGatewayService.listAvailable(fixture.brandId);
    const codes = available.map((g: any) => g.code);

    expect(codes).toContain(globalGateway.code);
    expect(codes).toContain(ownGateway.code);
    expect(codes).not.toContain(foreignGateway.code);

    await PaymentGatewayModel.deleteMany({ brand: foreignFixture.brandId });
    await cleanupFixture(foreignFixture);
  });

  it("rejects creating a PaymentProvider against a gateway that doesn't exist or isn't visible to this brand", async () => {
    const foreignFixture = await createBaseFixture(`epp-foreign2-${runTag}`);
    const foreignGateway = await createTestGateway({ brand: foreignFixture.brandId });

    await expect(
      paymentProviderService.create({
        brandId: fixture.brandId, createdBy: fixture.userId,
        data: {
          gateway: foreignGateway._id, name: new Map([["en", "Should Fail"]]), code: `FAIL-${runTag}`,
        },
      }),
    ).rejects.toThrow(/does not exist|not available/i);

    await PaymentGatewayModel.deleteMany({ brand: foreignFixture.brandId });
    await cleanupFixture(foreignFixture);
  });

  it("resolveCandidates() ranks a branch-specific Provider ahead of a brand-wide one regardless of priority number, and filters by allowedChannels", async () => {
    const gateway = await createTestGateway({ brand: fixture.brandId });

    const brandWide = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "Brand Wide"]]), code: `BW-${runTag}`, priority: 0 },
    });
    const branchSpecific = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, branch: fixture.branchId, name: new Map([["en", "Branch Specific"]]), code: `BS-${runTag}`, priority: 5 },
    });
    const wrongChannelOnly = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "QR Only"]]), code: `QR-${runTag}`, priority: -1, allowedChannels: ["QR"] },
    });

    const candidates = await paymentProviderService.resolveCandidates({ brand: fixture.brandId, branch: fixture.branchId, channel: "POS" });
    const ids = candidates.map((c: any) => String(c._id));

    expect(ids[0]).toBe(String(branchSpecific._id)); // branch-specific wins despite higher priority number
    expect(ids).toContain(String(brandWide._id));
    expect(ids).not.toContain(String(wrongChannelOnly._id)); // QR-only provider excluded from a POS request
  });

  it("MerchantAccount: rejects a missing required credential field declared on the gateway's own schema", async () => {
    const gateway = await createTestGateway({ brand: fixture.brandId });
    const provider = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "Cred Test Provider"]]), code: `CT-${runTag}` },
    });

    await expect(
      merchantAccountService.create({
        brandId: fixture.brandId, createdBy: fixture.userId,
        data: {
          provider: provider._id, name: new Map([["en", "Missing Key"]]),
          credentials: { merchantId: "M-123" }, // apiKey deliberately omitted, required:true on the schema
        },
      }),
    ).rejects.toThrow(/Missing required credential field "apiKey"/);
  });

  it("MerchantAccount: encrypts secret credential fields at rest, decrypts correctly, and never returns them in the safe-JSON view", async () => {
    const gateway = await createTestGateway({ brand: fixture.brandId });
    const provider = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "Encryption Test Provider"]]), code: `ENC-${runTag}` },
    });

    const account = await merchantAccountService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: {
        provider: provider._id, name: new Map([["en", "Cairo Account"]]),
        credentials: { apiKey: "sk_live_supersecret12345", merchantId: "MID-9988", webhookSecret: "whsec_abcXYZ" },
      },
    });

    // Raw stored document must never contain the plaintext.
    const raw = await MerchantAccountModel.findById(account._id).lean();
    expect(raw!.credentialValues.merchantId).toBe("MID-9988"); // non-secret stays plain
    const rawApiKey = raw!.secretCredentials.find((s: any) => s.key === "apiKey");
    expect(rawApiKey!.ciphertext).toBeTruthy();
    expect(rawApiKey!.ciphertext).not.toContain("supersecret");

    // Decryption round-trip actually recovers the real value.
    const decrypted = await merchantAccountService.getDecryptedSecret(account._id, "apiKey");
    expect(decrypted).toBe("sk_live_supersecret12345");

    // The safe-JSON view masks it, never returns it raw.
    const safe = merchantAccountService.toSafeJSON(account);
    const maskedApiKey = safe.secretCredentials.find((s: any) => s.key === "apiKey");
    expect(maskedApiKey!.masked).toBe("****2345");
    expect(JSON.stringify(safe)).not.toContain("supersecret12345");
  });

  it("resolveAccount(): honors branch/register/channel restrictions and priority ordering", async () => {
    const gateway = await createTestGateway({ brand: fixture.brandId });
    const provider = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "Resolve Test Provider"]]), code: `RES-${runTag}` },
    });

    const restrictedAccount = await merchantAccountService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: {
        provider: provider._id, name: new Map([["en", "Branch 1 Only"]]), priority: 0,
        credentials: { apiKey: "key-1", merchantId: "M-1" },
        allowedBranches: [fixture.branchId], allowedCashRegisters: [cashRegisterId],
      },
    });
    const fallbackAccount = await merchantAccountService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: {
        provider: provider._id, name: new Map([["en", "Unrestricted Fallback"]]), priority: 10,
        credentials: { apiKey: "key-2", merchantId: "M-2" },
      },
    });

    // A request for branch 1 + the right register resolves the restricted, higher-priority account.
    const resolved1 = await merchantAccountService.resolveAccount({
      brand: fixture.brandId, providerId: provider._id, branch: fixture.branchId, cashRegister: cashRegisterId,
    });
    expect(String(resolved1!._id)).toBe(String(restrictedAccount._id));

    // A request for the SECOND branch (not in restrictedAccount.allowedBranches) skips it and
    // falls through to the unrestricted account instead of returning nothing.
    const resolved2 = await merchantAccountService.resolveAccount({
      brand: fixture.brandId, providerId: provider._id, branch: secondBranchId,
    });
    expect(String(resolved2!._id)).toBe(String(fallbackAccount._id));

    // No account at all for a provider nobody configured — fails closed, doesn't guess.
    const resolvedNone = await merchantAccountService.resolveAccount({
      brand: fixture.brandId, providerId: new mongoose.Types.ObjectId(),
    });
    expect(resolvedNone).toBeNull();
  });

  it("PUT lockdown: the generic update() cannot rewrite provider, credentialValues, or secretCredentials directly", async () => {
    const gateway = await createTestGateway({ brand: fixture.brandId });
    const providerA = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "Lockdown A"]]), code: `LDA-${runTag}` },
    });
    const providerB = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "Lockdown B"]]), code: `LDB-${runTag}` },
    });

    const account = await merchantAccountService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: {
        provider: providerA._id, name: new Map([["en", "Lockdown Test"]]),
        credentials: { apiKey: "original-key", merchantId: "ORIGINAL" },
      },
    });

    await merchantAccountService.update({
      id: account._id, brandId: fixture.brandId, updatedBy: fixture.userId,
      data: {
        provider: providerB._id, // attempted hijack to a different provider
        credentialValues: { merchantId: "HACKED" }, // attempted direct write bypassing encryption
        name: new Map([["en", "Renamed"]]), // the one legitimate field in this payload
      },
    });

    const after = await MerchantAccountModel.findById(account._id).lean();
    expect(String(after!.provider)).toBe(String(providerA._id)); // unchanged — locked
    expect(after!.credentialValues.merchantId).toBe("ORIGINAL"); // unchanged — locked
    expect(after!.name.en).toBe("Renamed"); // the legitimate field DID update
  });
});
