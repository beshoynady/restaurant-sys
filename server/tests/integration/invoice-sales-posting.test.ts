// V4.0 Journal Entry Posting Engine — Sales Invoice integration.
// Verifies: creating an Invoice with AccountingSettings + an open AccountingPeriod configured
// automatically posts a balanced Sales journal entry and links it back onto the invoice; creating
// an Invoice with NO AccountingSettings configured still succeeds (posting is best-effort, not a
// hard dependency of invoice creation).
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture,
  createAccountingPeriodFixture,
  createAccountingSettingsFixture,
  createInvoiceSettingsFixture,
  cleanupFixture,
  type TestFixture,
} from "./fixtures.js";
import invoiceService from "../../modules/sales/invoice/invoice.service.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import InvoiceModel from "../../modules/sales/invoice/invoice.model.js";

function invoiceLineItem() {
  return {
    orderItemId: new mongoose.Types.ObjectId(),
    product: new mongoose.Types.ObjectId(),
    quantity: 1,
    price: 100,
    priceAfterDiscount: 90,
    totalprice: 100,
    totalExtrasPrice: 1,
  };
}

// Unique per test-process run — see journal-entry-posting-engine.test.ts's runTag comment for why.
const runTag = Math.random().toString(36).slice(2, 8);

describe("V4.0: Sales Invoice auto-posting", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`inv-post-${runTag}`);
  });

  afterAll(async () => {
    await InvoiceModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("posts a balanced Sales journal entry and links it onto the invoice when accounting is configured", async () => {
    await createAccountingPeriodFixture(fixture, "invoice-posting", {
      startDate: new Date(Date.UTC(2020, 0, 1)),
      endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, "invoice-posting");
    // Distinct prefix per fixture: the live `invoices` collection still carries a legacy
    // single-field unique index on `serial` alone (superseded in invoice.model.js by a
    // {brand,branch,serial} compound index, but never dropped) — see this file's sibling
    // journal-entry-posting-engine.test.ts for the analogous accountingsettings finding.
    await createInvoiceSettingsFixture(fixture, { invoiceSequence: { prefix: "IPST", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 } });

    const invoice = await invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem()],
        subtotal: 100,
        discount: 10,
        addition: 0,
        salesTax: 5,
        serviceTax: 0,
        deliveryFee: 0,
        total: 95,
      },
    });

    expect(invoice.journalEntry).toBeTruthy();

    const entry = await JournalEntryModel.findById(invoice.journalEntry).lean();
    expect(entry).toBeTruthy();
    expect(entry!.status).toBe("Posted");
    expect(entry!.isBalanced).toBe(true);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);

    // No dedicated `activities.sales.discount` account is configured in this fixture, so the
    // $10 discount folds directly into the revenue credit (100 - 10 = 90) instead of a separate
    // contra line (see invoice.service.ts#buildSalesInvoiceLines); tax ($5) posts to its own
    // (required) account; cash absorbs the balancing debit (90 + 5 = 95).
    const lines = await JournalLineModel.find({ journalEntry: invoice.journalEntry }).lean();
    const revenueLine = lines.find((l) => l.credit === 90);
    const taxLine = lines.find((l) => l.credit === 5);
    const cashLine = lines.find((l) => l.debit === 95);
    expect(revenueLine).toBeTruthy();
    expect(taxLine).toBeTruthy();
    expect(cashLine).toBeTruthy();
  });

  it("still creates the invoice when no AccountingSettings exist (posting skipped, non-blocking)", async () => {
    const unconfiguredFixture = await createBaseFixture(`inv-unconf-${runTag}`);
    await createInvoiceSettingsFixture(unconfiguredFixture, { invoiceSequence: { prefix: "IPUC", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 } });

    try {
      const invoice = await invoiceService.create({
        brandId: unconfiguredFixture.brandId,
        branchId: unconfiguredFixture.branchId,
        createdBy: unconfiguredFixture.userId,
        data: {
          brand: unconfiguredFixture.brandId,
          branch: unconfiguredFixture.branchId,
          cashierShift: new mongoose.Types.ObjectId(),
          order: new mongoose.Types.ObjectId(),
          items: [invoiceLineItem()],
          subtotal: 50,
          total: 50,
        },
      });

      expect(invoice).toBeTruthy();
      expect(invoice.journalEntry).toBeFalsy();
    } finally {
      await InvoiceModel.deleteMany({ brand: unconfiguredFixture.brandId });
      await cleanupFixture(unconfiguredFixture);
    }
  });
});
