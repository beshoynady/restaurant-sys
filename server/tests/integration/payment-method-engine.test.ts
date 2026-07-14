// Supply Chain & Commerce Platform V6.0 — Production Hardening. PaymentMethod is a `required: true`
// reference on PurchaseInvoice.paymentMethod, PurchaseReturnInvoice.refundMethod, and
// SupplierTransaction.paymentMethod, but its router previously imported its controller from a
// nonexistent path (`./payments/payment-method.controller.js`) and was never mounted — meaning no
// real brand could create one via API at all. Fixed (correct import path, RBAC added, mounted at
// /finance/payment-methods, `softDelete`/`searchFields` typo corrected to
// `enableSoftDelete`/`searchableFields`). This test proves the service actually works end-to-end.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import paymentMethodService from "../../modules/payments/payment-method/payment-method.service.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";

describe("Supply Chain V6.0: Payment Method Service (fixed broken import + RBAC + typo)", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("payment-method");
  });

  afterAll(async () => {
    await Promise.all([
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("creates, lists, soft-deletes, and restores a payment method", async () => {
    const cashAccount = await AccountModel.create({
      brand: fixture.brandId, code: "CASH-PM", name: new Map([["en", "Cash"]]), category: "Asset", normalBalance: "Debit",
    });
    const cashRegister = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: "REG-PM",
      name: new Map([["en", "PM Register"]]), accountId: cashAccount._id, currency: "EGP", createdBy: fixture.userId,
    });

    const method = await paymentMethodService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        name: new Map([["en", "Cash"]]),
        paymentCategory: "Cash",
        paymentType: "Offline",
        type: "CashRegister",
        reference: cashRegister._id,
      },
    });
    expect(method.paymentCategory).toBe("Cash");
    expect(method.isDeleted).toBe(false);

    const listed = await paymentMethodService.getAll({ brandId: fixture.brandId, limit: 100 });
    expect(listed.data.some((m: any) => String(m._id) === String(method._id))).toBe(true);

    await paymentMethodService.softDelete({ id: method._id, brandId: fixture.brandId, deletedBy: fixture.userId });
    const afterSoftDelete = await paymentMethodService.getAll({ brandId: fixture.brandId, limit: 100 });
    expect(afterSoftDelete.data.some((m: any) => String(m._id) === String(method._id))).toBe(false);

    await paymentMethodService.restore({ id: method._id, brandId: fixture.brandId });
    const restored = await PaymentMethodModel.findById(method._id);
    expect(restored?.isDeleted).toBe(false);
  });
});
