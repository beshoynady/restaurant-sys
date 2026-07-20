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
  let registerA: { _id: mongoose.Types.ObjectId };
  let registerAAccount: { _id: mongoose.Types.ObjectId };
  let registerB: { _id: mongoose.Types.ObjectId };
  let registerBAccount: { _id: mongoose.Types.ObjectId };
  let foreignFixture: TestFixture;
  let foreignRegister: { _id: mongoose.Types.ObjectId };
  let foreignRegisterAccount: { _id: mongoose.Types.ObjectId };

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
    registerAAccount = await createAccountFixture(fixture, `REG-${runTag}`, "Asset");
    registerA = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: { en: "Test Register" }, code: `REG-${runTag}`,
      type: "SAFE", accountId: registerAAccount._id, currency: "EGP", createdBy: fixture.userId,
    });
    cashMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, branch: null, name: { en: "Cash" }, paymentCategory: "Cash",
      type: "CashRegister", reference: registerA._id, createdBy: fixture.userId,
    });

    // Second register on the same brand/branch — used to prove split-tender posts per-account (finding #2).
    registerBAccount = await createAccountFixture(fixture, `REGB-${runTag}`, "Asset");
    registerB = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: { en: "Test Register B" }, code: `REGB-${runTag}`,
      type: "SAFE", accountId: registerBAccount._id, currency: "EGP", createdBy: fixture.userId,
    });

    // A register belonging to a different brand entirely — used to prove cross-tenant resolution is
    // rejected rather than silently used as the GL debit target (finding #3).
    foreignFixture = await createBaseFixture(`pay-foreign-${runTag}`);
    foreignRegisterAccount = await createAccountFixture(foreignFixture, `REGF-${runTag}`, "Asset");
    foreignRegister = await CashRegisterModel.create({
      brand: foreignFixture.brandId, branch: foreignFixture.branchId, name: { en: "Foreign Register" }, code: `REGF-${runTag}`,
      type: "SAFE", accountId: foreignRegisterAccount._id, currency: "EGP", createdBy: foreignFixture.userId,
    });
  });

  afterAll(async () => {
    await PaymentModel.deleteMany({ brand: fixture.brandId });
    await InvoiceModel.deleteMany({ brand: fixture.brandId });
    await CashTransactionModel.deleteMany({ brand: fixture.brandId });
    await TaxConfigModel.deleteMany({ brand: fixture.brandId });
    await CashRegisterModel.deleteMany({ brand: { $in: [fixture.brandId, foreignFixture.brandId] } });
    await cleanupFixture(fixture);
    await cleanupFixture(foreignFixture);
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
      tenders: [{ paymentMethod: cashMethod._id, amount: 100, cashRegister: registerA._id }],
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
    // Finding #1: the CashTransaction must carry the tender's cashRegister, or CashierShift.countShift()'s
    // `{cashRegister: {$ne: null}}` filter silently excludes it from reconciliation.
    expect(cashTx!.cashRegister?.toString()).toBe(registerA._id.toString());

    const entry = await JournalEntryModel.findById(payment.journalEntry).lean();
    expect(entry).toBeTruthy();
    expect(entry!.isBalanced).toBe(true);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: payment.journalEntry }).lean();
    const creditLine = lines.find((l) => l.credit === 100);
    const debitLine = lines.find((l) => l.debit === 100);
    expect(debitLine!.account.toString()).toBe(registerAAccount._id.toString());
    const settings = await accountingSettingService.resolveForPosting(fixture.brandId, fixture.branchId);
    expect(creditLine!.account.toString()).toBe(settings.controlAccounts.accountsReceivable.toString());
  });

  it("split tender across two cash registers posts one debit line per register, not one collapsed line (finding #2)", async () => {
    const invoice = await createTestInvoice(100);

    const payment = await paymentService.recordPayment({
      brand: fixture.brandId,
      branch: fixture.branchId,
      invoice: invoice._id,
      tenders: [
        { paymentMethod: cashMethod._id, amount: 60, cashRegister: registerA._id },
        { paymentMethod: cashMethod._id, amount: 40, cashRegister: registerB._id },
      ],
      actorId: fixture.userId,
    });

    expect(payment.cashTransactions).toHaveLength(2);
    const cashTxs = await CashTransactionModel.find({ invoiceId: invoice._id }).lean();
    const txForA = cashTxs.find((t) => t.amount === 60);
    const txForB = cashTxs.find((t) => t.amount === 40);
    expect(txForA!.cashRegister?.toString()).toBe(registerA._id.toString());
    expect(txForB!.cashRegister?.toString()).toBe(registerB._id.toString());

    const entry = await JournalEntryModel.findById(payment.journalEntry).lean();
    expect(entry!.isBalanced).toBe(true);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);

    const lines = await JournalLineModel.find({ journalEntry: payment.journalEntry }).lean();
    const debitLines = lines.filter((l) => l.debit > 0);
    expect(debitLines).toHaveLength(2);
    const debitForA = debitLines.find((l) => l.account.toString() === registerAAccount._id.toString());
    const debitForB = debitLines.find((l) => l.account.toString() === registerBAccount._id.toString());
    expect(debitForA!.debit).toBe(60);
    expect(debitForB!.debit).toBe(40);

    const creditLine = lines.find((l) => l.credit === 100);
    const settings = await accountingSettingService.resolveForPosting(fixture.brandId, fixture.branchId);
    expect(creditLine!.account.toString()).toBe(settings.controlAccounts.accountsReceivable.toString());
  });

  it("rejects a cashRegister belonging to a different brand rather than resolving it as the GL account (finding #3)", async () => {
    const invoice = await createTestInvoice(100);
    const settings = await accountingSettingService.resolveForPosting(fixture.brandId, fixture.branchId);

    const payment = await paymentService.recordPayment({
      brand: fixture.brandId,
      branch: fixture.branchId,
      invoice: invoice._id,
      tenders: [{ paymentMethod: cashMethod._id, amount: 100, cashRegister: foreignRegister._id }],
      actorId: fixture.userId,
    });

    // The invoice/payment fact still records — GL posting falls back to the brand's default cash
    // account rather than ever resolving a foreign brand's register.
    const entry = await JournalEntryModel.findById(payment.journalEntry).lean();
    expect(entry).toBeTruthy();
    const lines = await JournalLineModel.find({ journalEntry: payment.journalEntry }).lean();
    const debitLine = lines.find((l) => l.debit === 100);
    expect(debitLine!.account.toString()).toBe(settings.controlAccounts.cash.toString());
    expect(debitLine!.account.toString()).not.toBe(foreignRegisterAccount._id.toString());
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

  it("concurrent duplicate payment: two simultaneous requests with the same idempotencyKey both resolve to one Payment, balance drawn down once", async () => {
    const invoice = await createTestInvoice(100);
    const idempotencyKey = `concurrent-dup-${runTag}`;

    const results = await Promise.allSettled([
      paymentService.recordPayment({
        brand: fixture.brandId, branch: fixture.branchId, invoice: invoice._id,
        tenders: [{ paymentMethod: cashMethod._id, amount: 100, cashRegister: registerA._id }],
        idempotencyKey, actorId: fixture.userId,
      }),
      paymentService.recordPayment({
        brand: fixture.brandId, branch: fixture.branchId, invoice: invoice._id,
        tenders: [{ paymentMethod: cashMethod._id, amount: 100, cashRegister: registerA._id }],
        idempotencyKey, actorId: fixture.userId,
      }),
    ]);

    // Both requests are the SAME logical payment retried concurrently — both must resolve
    // successfully (not one success + one error), and to the same Payment record.
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const values = results.map((r) => (r as PromiseFulfilledResult<any>).value);
    expect(String(values[0]._id)).toBe(String(values[1]._id));

    const count = await PaymentModel.countDocuments({ invoice: invoice._id, idempotencyKey });
    expect(count).toBe(1);

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(0); // drawn down exactly once, not twice
  });

  it("transaction rollback: a CashTransaction validation failure rolls back the Invoice balance and the Payment together", async () => {
    const invoice = await createTestInvoice(100);

    // No paymentMethod on the tender -> CashTransaction schema validation fails mid-transaction.
    await expect(
      paymentService.recordPayment({
        brand: fixture.brandId,
        branch: fixture.branchId,
        invoice: invoice._id,
        tenders: [{ amount: 100, cashRegister: registerA._id }],
        actorId: fixture.userId,
      }),
    ).rejects.toThrow();

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(100); // rolled back, not left half-decremented
    expect(updatedInvoice!.status).toBe("OPEN");

    expect(await PaymentModel.countDocuments({ invoice: invoice._id })).toBe(0);
    expect(await CashTransactionModel.countDocuments({ invoiceId: invoice._id })).toBe(0);
  });

  it("transaction rollback: a journal-posting failure (no AccountingSettings) rolls back the Invoice, Payment, and already-created CashTransaction together", async () => {
    const unconfigured = await createBaseFixture(`pay-unconf-${runTag}`);
    await createInvoiceSettingsFixture(unconfigured, {
      invoiceSequence: { prefix: "UPST", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 },
    });
    await CashierShiftSettingsModel.create({ brand: unconfigured.brandId, branch: unconfigured.branchId, createdBy: unconfigured.userId });
    const method = await PaymentMethodModel.create({
      brand: unconfigured.brandId, branch: null, name: { en: "Cash" }, paymentCategory: "Cash",
      type: "CashRegister", reference: registerA._id, createdBy: unconfigured.userId,
    });

    // Deliberately no createAccountingSettingsFixture() call — this brand has zero AccountingSettings.
    const invoice = await invoiceService.create({
      brandId: unconfigured.brandId,
      branchId: unconfigured.branchId,
      createdBy: unconfigured.userId,
      data: {
        brand: unconfigured.brandId,
        branch: unconfigured.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(100)],
      },
    });
    expect(invoice.balanceDue).toBe(100);

    await expect(
      paymentService.recordPayment({
        brand: unconfigured.brandId,
        branch: unconfigured.branchId,
        invoice: invoice._id,
        tenders: [{ paymentMethod: method._id, amount: 100 }],
        actorId: unconfigured.userId,
      }),
    ).rejects.toThrow(/AccountingSettings/i);

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.balanceDue).toBe(100); // rolled back
    expect(updatedInvoice!.status).toBe("OPEN");

    expect(await PaymentModel.countDocuments({ invoice: invoice._id })).toBe(0);
    // The CashTransaction created earlier in this SAME failed attempt must be rolled back too —
    // proving atomicity across all four operations, not just the first one.
    expect(await CashTransactionModel.countDocuments({ invoiceId: invoice._id })).toBe(0);

    await PaymentModel.deleteMany({ brand: unconfigured.brandId });
    await InvoiceModel.deleteMany({ brand: unconfigured.brandId });
    await CashTransactionModel.deleteMany({ brand: unconfigured.brandId });
    await cleanupFixture(unconfigured);
  });
});
