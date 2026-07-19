// ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1 — Payment aggregate.
// Verifies: recording a payment atomically draws down Invoice.balanceDue/amountPaid, transitions
// status (OPEN -> PARTIALLY_PAID -> PAID), creates a real CashTransaction per tender (closing
// PAYMENT_LIFECYCLE_AUDIT.md's "zero production creators" finding), posts a balanced
// SALES_PAYMENT_RECEIPT journal entry (Debit Cash, Credit Accounts Receivable — not the other way
// around, which was Phase 0's fix), rejects a payment exceeding the remaining balance, replays
// idempotently when the same idempotencyKey is reused, and only lets one of two concurrent
// over-the-balance payments succeed.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture,
  createAccountingPeriodFixture,
  createAccountingSettingsFixture,
  createInvoiceSettingsFixture,
  createAccountFixture,
  cleanupFixture,
  type TestFixture,
} from "./fixtures.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import invoiceService from "../../modules/sales/invoice/invoice.service.js";
import paymentService from "../../modules/sales/payment/payment.service.js";
import PaymentModel from "../../modules/sales/payment/payment.model.js";
import InvoiceModel from "../../modules/sales/invoice/invoice.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import CashTransactionModel from "../../modules/finance/cash-transaction/cash-transaction.model.js";
import CashierShiftSettingsModel from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import TaxConfigModel from "../../modules/system/tax-settings/tax-config.model.js";
import accountingSettingService from "../../modules/accounting/accounting-settings/accounting-setting.service.js";

function invoiceLineItem(desiredSubtotal = 100) {
  return {
    orderItemId: new mongoose.Types.ObjectId(),
    product: new mongoose.Types.ObjectId(),
    quantity: 1,
    price: desiredSubtotal,
    priceAfterDiscount: desiredSubtotal,
    totalprice: desiredSubtotal - 1,
    totalExtrasPrice: 1,
  };
}

const runTag = Math.random().toString(36).slice(2, 8);

describe("ADR-001 Phase 1: Payment recording", () => {
  let fixture: TestFixture;
  let cashMethod: { _id: mongoose.Types.ObjectId };

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`pay-${runTag}`);
    await createAccountingPeriodFixture(fixture, "payment", {
      startDate: new Date(Date.UTC(2020, 0, 1)),
      endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, "payment");
    await createInvoiceSettingsFixture(fixture, { invoiceSequence: { prefix: "PPST", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 } });
    await CashierShiftSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
    const registerAccount = await createAccountFixture(fixture, `REG-${runTag}`, "Asset");
    const register = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: { en: "Test Register" }, code: `REG-${runTag}`,
      type: "SAFE", accountId: registerAccount._id, currency: "EGP", createdBy: fixture.userId,
    });
    cashMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, branch: null, name: { en: "Cash" }, paymentCategory: "Cash",
      type: "CashRegister", reference: register._id, createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await PaymentModel.deleteMany({ brand: fixture.brandId });
    await InvoiceModel.deleteMany({ brand: fixture.brandId });
    await CashTransactionModel.deleteMany({ brand: fixture.brandId });
    await TaxConfigModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createTestInvoice(subtotal = 100) {
    return invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(subtotal)],
      },
    });
  }

  it("full payment: draws balance to zero, marks PAID, creates one CashTransaction and a balanced Debit-Cash/Credit-AR journal entry", async () => {
    const invoice = await createTestInvoice(100);
    expect(invoice.balanceDue).toBe(100);
    expect(invoice.status).toBe("OPEN");

    const payment = await paymentService.recordPayment({
      brand: fixture.brandId,
      branch: fixture.branchId,
      invoice: invoice._id,
      tenders: [{ paymentMethod: cashMethod._id, amount: 100 }],
      actorId: fixture.userId,
    });

    expect(payment.totalAmount).toBe(100);
    expect(payment.cashTransactions).toHaveLength(1);

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(0);
    expect(updatedInvoice!.amountPaid).toBe(100);
    expect(updatedInvoice!.status).toBe("PAID");

    const cashTx = await CashTransactionModel.findOne({ invoiceId: invoice._id }).lean();
    expect(cashTx).toBeTruthy();
    expect(cashTx!.direction).toBe("INFLOW");
    expect(cashTx!.status).toBe("POSTED");

    const entry = await JournalEntryModel.findById(payment.journalEntry).lean();
    expect(entry).toBeTruthy();
    expect(entry!.isBalanced).toBe(true);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: payment.journalEntry }).lean();
    const settings = await accountingSettingService.resolveForPosting(fixture.brandId, fixture.branchId);
    const debitLine = lines.find((l) => l.debit === 100);
    const creditLine = lines.find((l) => l.credit === 100);
    expect(debitLine!.account.toString()).toBe(settings.controlAccounts.cash.toString());
    expect(creditLine!.account.toString()).toBe(settings.controlAccounts.accountsReceivable.toString());
  });

  it("partial payment: leaves a remaining balance and sets status to PARTIALLY_PAID", async () => {
    const invoice = await createTestInvoice(100);

    const payment = await paymentService.recordPayment({
      brand: fixture.brandId,
      branch: fixture.branchId,
      invoice: invoice._id,
      tenders: [{ paymentMethod: cashMethod._id, amount: 40 }],
      actorId: fixture.userId,
    });

    expect(payment.totalAmount).toBe(40);
    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(60);
    expect(updatedInvoice!.amountPaid).toBe(40);
    expect(updatedInvoice!.status).toBe("PARTIALLY_PAID");
  });

  it("rejects a payment that exceeds the invoice's remaining balance", async () => {
    const invoice = await createTestInvoice(50);

    await expect(
      paymentService.recordPayment({
        brand: fixture.brandId,
        branch: fixture.branchId,
        invoice: invoice._id,
        tenders: [{ paymentMethod: cashMethod._id, amount: 999 }],
        actorId: fixture.userId,
      }),
    ).rejects.toThrow(/exceeds|remaining balance/i);

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(50); // unchanged
  });

  it("idempotency: a retried request with the same idempotencyKey returns the original payment, not a duplicate", async () => {
    const invoice = await createTestInvoice(80);
    const idempotencyKey = `retry-${runTag}`;

    const first = await paymentService.recordPayment({
      brand: fixture.brandId,
      branch: fixture.branchId,
      invoice: invoice._id,
      tenders: [{ paymentMethod: cashMethod._id, amount: 80 }],
      idempotencyKey,
      actorId: fixture.userId,
    });

    const replay = await paymentService.recordPayment({
      brand: fixture.brandId,
      branch: fixture.branchId,
      invoice: invoice._id,
      tenders: [{ paymentMethod: cashMethod._id, amount: 80 }],
      idempotencyKey,
      actorId: fixture.userId,
    });

    expect(String(replay._id)).toBe(String(first._id));

    const count = await PaymentModel.countDocuments({ invoice: invoice._id });
    expect(count).toBe(1);

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(0); // drawn down only once, not twice
  });

  it("concurrency: only one of two simultaneous payments summing to more than the balance succeeds", async () => {
    const invoice = await createTestInvoice(100);

    const results = await Promise.allSettled([
      paymentService.recordPayment({
        brand: fixture.brandId, branch: fixture.branchId, invoice: invoice._id,
        tenders: [{ paymentMethod: cashMethod._id, amount: 70 }], actorId: fixture.userId,
      }),
      paymentService.recordPayment({
        brand: fixture.brandId, branch: fixture.branchId, invoice: invoice._id,
        tenders: [{ paymentMethod: cashMethod._id, amount: 70 }], actorId: fixture.userId,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(30); // exactly one 70 applied, never negative
  });
});
