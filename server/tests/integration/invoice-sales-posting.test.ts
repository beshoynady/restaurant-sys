// V4.0 Invoice Pricing Engine + Journal Entry Posting Engine — Sales Invoice integration.
// Verifies: creating an Invoice recomputes subtotal/salesTax/total server-side from items[] +
// TaxConfig/DiscountSettings (client-supplied subtotal/salesTax/total are ignored), then
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
import TaxConfigModel from "../../modules/system/tax-settings/tax-config.model.js";

// invoice.model.js requires totalExtrasPrice >= 1 — split the desired subtotal as
// (desiredSubtotal - 1) + 1 so items[].totalprice + items[].totalExtrasPrice sums to exactly
// `desiredSubtotal`, keeping the pricing-engine assertions below exact round numbers.
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

// Unique per test-process run — see journal-entry-posting-engine.test.ts's runTag comment for why.
const runTag = Math.random().toString(36).slice(2, 8);

describe("V4.0: Sales Invoice pricing + auto-posting", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`inv-post-${runTag}`);
  });

  afterAll(async () => {
    await InvoiceModel.deleteMany({ brand: fixture.brandId });
    await TaxConfigModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("recomputes pricing server-side and posts a balanced Sales journal entry", async () => {
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
    await TaxConfigModel.create({
      brand: fixture.brandId,
      branch: null,
      enabled: true,
      percentage: 5,
      calculationMethod: "AFTER_DISCOUNT",
      pricesIncludeTax: false,
      createdBy: fixture.userId,
    });

    // Client attempts to lie about the totals — subtotal/salesTax/total below should all be
    // ignored/overwritten by the server; only `items[]` and `discount` should actually matter.
    const invoice = await invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(100)],
        discount: 10,
        subtotal: 1,
        salesTax: 999,
        serviceTax: 999,
        total: 0.01,
      },
    });

    // subtotal = 100 (from items[]); taxableBase = 100 - 10 (AFTER_DISCOUNT) = 90;
    // salesTax = 90 * 5% = 4.5; serviceTax = 0 (no ServiceCharge configured);
    // total = 100 - 10 + 0 + 4.5 + 0 + 0 = 94.5.
    expect(invoice.subtotal).toBe(100);
    expect(invoice.discount).toBe(10);
    expect(invoice.salesTax).toBe(4.5);
    expect(invoice.serviceTax).toBe(0);
    expect(invoice.total).toBe(94.5);

    expect(invoice.journalEntry).toBeTruthy();

    const entry = await JournalEntryModel.findById(invoice.journalEntry).lean();
    expect(entry).toBeTruthy();
    expect(entry!.status).toBe("Posted");
    expect(entry!.isBalanced).toBe(true);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);

    // No dedicated `activities.sales.discount` account is configured in this fixture, so the
    // $10 discount folds directly into the revenue credit (100 - 10 = 90) instead of a separate
    // contra line (see invoice.service.ts#buildSalesInvoiceLines); tax ($4.50) posts to its own
    // (required) account; cash absorbs the balancing debit (90 + 4.5 = 94.5).
    const lines = await JournalLineModel.find({ journalEntry: invoice.journalEntry }).lean();
    const revenueLine = lines.find((l) => l.credit === 90);
    const taxLine = lines.find((l) => l.credit === 4.5);
    const cashLine = lines.find((l) => l.debit === 94.5);
    expect(revenueLine).toBeTruthy();
    expect(taxLine).toBeTruthy();
    expect(cashLine).toBeTruthy();
  });

  it("rejects a discount above the approval threshold without discountApprovedBy", async () => {
    // No DiscountSettings configured for this brand -> falls back to the conservative default
    // (maxManualDiscount: 20%, approvalThreshold: 20%, requireManagerApproval: true).
    await expect(
      invoiceService.create({
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        createdBy: fixture.userId,
        data: {
          brand: fixture.brandId,
          branch: fixture.branchId,
          cashierShift: new mongoose.Types.ObjectId(),
          order: new mongoose.Types.ObjectId(),
          items: [invoiceLineItem(100)],
          discount: 50, // 50% — well above the 20% default threshold
        },
      }),
    ).rejects.toThrow(/exceeds/i);
  });

  it("allows a discount above the threshold when discountApprovedBy is supplied", async () => {
    const invoice = await invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(100)],
        discount: 50,
        discountApprovedBy: fixture.userId,
      },
    });

    expect(invoice.discount).toBe(50);
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
          items: [invoiceLineItem(50)],
        },
      });

      expect(invoice).toBeTruthy();
      expect(invoice.subtotal).toBe(50);
      expect(invoice.journalEntry).toBeFalsy();
    } finally {
      await InvoiceModel.deleteMany({ brand: unconfiguredFixture.brandId });
      await cleanupFixture(unconfiguredFixture);
    }
  });
});
