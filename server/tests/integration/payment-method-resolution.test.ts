// Enterprise Payment Platform V1 Phase 2 — Payment Method Resolution Engine.
// Verifies: a Cash-type method resolves to the caller's own register context, falling back to the
// method's configured default only when the caller has none; a PaymentProvider-type method with
// no PaymentProviderMapping configured falls back to its Phase-1 fixed `reference` pointer
// (backward compatible); a method WITH ranked mappings tries them in priority order and
// automatically falls through past an inactive provider to the next-ranked one (the real
// automatic-failover the mission asked for); a channel-restricted provider is skipped when the
// caller's channel doesn't match or is unspecified; resolution fails closed (UNRESOLVED) rather
// than guessing when nothing is eligible.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createAccountFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import PaymentGatewayModel from "../../modules/payments/payment-gateway/payment-gateway.model.js";
import paymentGatewayService from "../../modules/payments/payment-gateway/payment-gateway.service.js";
import PaymentProviderModel from "../../modules/payments/payment-provider/payment-provider.model.js";
import paymentProviderService from "../../modules/payments/payment-provider/payment-provider.service.js";
import MerchantAccountModel from "../../modules/payments/merchant-account/merchant-account.model.js";
import merchantAccountService from "../../modules/payments/merchant-account/merchant-account.service.js";
import PaymentProviderMappingModel from "../../modules/payments/payment-provider-mapping/payment-provider-mapping.model.js";
import paymentProviderMappingService from "../../modules/payments/payment-provider-mapping/payment-provider-mapping.service.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import paymentMethodResolutionService from "../../modules/payments/payment-method/payment-method-resolution.service.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";

process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY || "b".repeat(64);

const runTag = Math.random().toString(36).slice(2, 8);

describe("Enterprise Payment Platform V1 Phase 2: Payment Method Resolution Engine", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`pmr-${runTag}`);
  });

  afterAll(async () => {
    await Promise.all([
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      PaymentProviderMappingModel.deleteMany({ brand: fixture.brandId }),
      MerchantAccountModel.deleteMany({ brand: fixture.brandId }),
      PaymentProviderModel.deleteMany({ brand: fixture.brandId }),
      PaymentGatewayModel.deleteMany({ brand: { $in: [null, fixture.brandId] }, code: { $regex: "^PMRTEST" } }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createGateway() {
    return paymentGatewayService.create({
      brandId: null, createdBy: fixture.userId,
      data: {
        code: `PMRTEST_GW_${runTag}_${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        name: new Map([["en", "PMR Test Gateway"]]),
        credentialSchema: [{ key: "apiKey", label: new Map([["en", "API Key"]]), type: "secret", required: true, secret: true }],
      },
    });
  }

  async function createProviderWithAccount(gatewayId: any, opts: { priority?: number; allowedChannels?: string[]; providerActive?: boolean } = {}) {
    const provider = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: {
        gateway: gatewayId, name: new Map([["en", `Provider ${Math.random()}`]]), code: `P-${runTag}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        isActive: opts.providerActive !== false, allowedChannels: opts.allowedChannels || [],
      },
    });
    const account = await merchantAccountService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { provider: provider._id, name: new Map([["en", "Account"]]), credentials: { apiKey: "key-123" } },
    });
    return { provider, account };
  }

  it("Cash-type method: resolves to the caller's own register context, falling back to the method's default only when none is supplied", async () => {
    const registerAccount = await createAccountFixture(fixture, `PMRREG-${runTag}`, "Asset");
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "PMR Register"]]),
      code: `PMRREG-${runTag}`, type: "SAFE", accountId: registerAccount._id, currency: "EGP", createdBy: fixture.userId,
    });

    const cashMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: register._id, createdBy: fixture.userId,
    });

    // Caller supplies its own register (the real, common case — a cashier's currently-open drawer).
    const callerRegisterId = new mongoose.Types.ObjectId();
    const withCallerContext = await paymentMethodResolutionService.resolve({
      brand: fixture.brandId, paymentMethodId: cashMethod._id, cashRegister: callerRegisterId,
    });
    expect(withCallerContext.resolutionType).toBe("CASH_REGISTER");
    expect(String((withCallerContext as any).cashRegister)).toBe(String(callerRegisterId));

    // No caller context -> falls back to the method's own configured default.
    const withoutCallerContext = await paymentMethodResolutionService.resolve({
      brand: fixture.brandId, paymentMethodId: cashMethod._id,
    });
    expect(withoutCallerContext.resolutionType).toBe("CASH_REGISTER");
    expect(String((withoutCallerContext as any).cashRegister)).toBe(String(register._id));
  });

  it("PaymentProvider-type method with NO mapping configured: falls back to the method's Phase-1 fixed `reference` pointer", async () => {
    const gateway = await createGateway();
    const { provider, account } = await createProviderWithAccount(gateway._id);

    const method = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Visa"]]), paymentCategory: "Card",
      type: "PaymentProvider", reference: provider._id, createdBy: fixture.userId,
    });

    const result = await paymentMethodResolutionService.resolve({ brand: fixture.brandId, paymentMethodId: method._id });
    expect(result.resolutionType).toBe("PAYMENT_PROVIDER");
    expect(String((result as any).provider._id)).toBe(String(provider._id));
    expect(String((result as any).merchantAccount._id)).toBe(String(account._id));
  });

  it("PaymentProvider-type method WITH ranked mappings: tries the highest-priority candidate first, and automatically falls through past a disabled provider to the next one", async () => {
    const gateway = await createGateway();
    const { provider: primaryProvider } = await createProviderWithAccount(gateway._id, { providerActive: false }); // disabled — must be skipped
    const { provider: fallbackProvider, account: fallbackAccount } = await createProviderWithAccount(gateway._id);

    const method = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Mastercard"]]), paymentCategory: "Card",
      type: "PaymentProvider", reference: primaryProvider._id, createdBy: fixture.userId,
    });

    await paymentProviderMappingService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { paymentMethod: method._id, provider: primaryProvider._id, priority: 0 },
    });
    await paymentProviderMappingService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { paymentMethod: method._id, provider: fallbackProvider._id, priority: 10 },
    });

    const result = await paymentMethodResolutionService.resolve({ brand: fixture.brandId, paymentMethodId: method._id });
    expect(result.resolutionType).toBe("PAYMENT_PROVIDER");
    // The disabled primary was skipped automatically — the lower-ranked but actually-usable
    // fallback provider is what actually got resolved.
    expect(String((result as any).provider._id)).toBe(String(fallbackProvider._id));
    expect(String((result as any).merchantAccount._id)).toBe(String(fallbackAccount._id));
  });

  it("skips a channel-restricted provider when the caller's channel doesn't match or is unspecified", async () => {
    const gateway = await createGateway();
    const { provider: qrOnlyProvider } = await createProviderWithAccount(gateway._id, { allowedChannels: ["QR"] });

    const method = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "QR Card"]]), paymentCategory: "Card",
      type: "PaymentProvider", reference: qrOnlyProvider._id, createdBy: fixture.userId,
    });

    const noChannel = await paymentMethodResolutionService.resolve({ brand: fixture.brandId, paymentMethodId: method._id });
    expect(noChannel.resolutionType).toBe("UNRESOLVED");

    const wrongChannel = await paymentMethodResolutionService.resolve({ brand: fixture.brandId, paymentMethodId: method._id, channel: "POS" });
    expect(wrongChannel.resolutionType).toBe("UNRESOLVED");

    const rightChannel = await paymentMethodResolutionService.resolve({ brand: fixture.brandId, paymentMethodId: method._id, channel: "QR" });
    expect(rightChannel.resolutionType).toBe("PAYMENT_PROVIDER");
  });

  it("fails closed (UNRESOLVED) rather than guessing when the referenced provider has no eligible merchant account at all", async () => {
    const gateway = await createGateway();
    const providerWithNoAccount = await paymentProviderService.create({
      brandId: fixture.brandId, createdBy: fixture.userId,
      data: { gateway: gateway._id, name: new Map([["en", "No Account Provider"]]), code: `NOACC-${runTag}` },
    });

    const method = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Broken Method"]]), paymentCategory: "Card",
      type: "PaymentProvider", reference: providerWithNoAccount._id, createdBy: fixture.userId,
    });

    const result = await paymentMethodResolutionService.resolve({ brand: fixture.brandId, paymentMethodId: method._id });
    expect(result.resolutionType).toBe("UNRESOLVED");
  });

  it("returns UNRESOLVED for an unknown/inactive/deleted payment method rather than throwing", async () => {
    const result = await paymentMethodResolutionService.resolve({
      brand: fixture.brandId, paymentMethodId: new mongoose.Types.ObjectId(),
    });
    expect(result.resolutionType).toBe("UNRESOLVED");
  });
});
