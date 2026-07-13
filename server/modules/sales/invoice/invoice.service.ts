// DATABASE_IMPLEMENTATION_PLAN.md DB-007: wires the atomic invoice-serial generator into invoice
// creation via BaseRepository's `beforeCreate` hook. `invoice.model.js` intentionally left as `.js`
// (out of this task's scope) — typed against `BaseRepository<any>`, matching order.service.ts's
// documented rationale.
import BaseRepository from "../../../utils/BaseRepository.js";
import throwErrorJs from "../../../utils/throwError.js";
import InvoiceModel from "./invoice.model.js";
import invoiceSettingsService from "../invoice-settings/invoice-settings.service.js";
import accountingSettingServiceJs from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryServiceJs from "../../accounting/journal-entry/journal-entry.service.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const accountingSettingService = accountingSettingServiceJs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const journalEntryService = journalEntryServiceJs as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function journalLine(account: any, description: string, debit: number, credit: number, currency: string) {
  return { account, description, debit, credit, currency };
}

/**
 * Journal Entry Posting Engine — Sales Invoice mapping (PA-15 / V4.0 Journal Entry Posting Engine).
 * Builds a balanced set of JournalLine inputs from an Invoice + the brand's AccountingSettings.
 * Exported (not a class-private method) so it can be unit-tested directly without going through a
 * live invoice creation.
 *
 * Design: `activities.sales.tax` is `required: true` on AccountingSettingModel (always
 * configured); `discount`/`serviceCharge`/`deliveryFee` are optional. Where an optional dedicated
 * account isn't configured, that amount folds into the revenue credit line instead of being
 * dropped — the entry is guaranteed to balance regardless of how many optional accounts a brand
 * has configured. `costOfSales` is intentionally NOT posted here: no recipe/inventory costing
 * exists yet in this codebase (see PLATFORM_FINAL_AUDIT.md PA-06) to supply a trustworthy COGS
 * amount — fabricating one would be worse than omitting it. Returns null if there's nothing
 * economically meaningful to post (e.g. a fully-discounted zero-value invoice).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSalesInvoiceLines(invoice: any, settings: any) {
  const currency = settings.currencySettings?.baseCurrency || "EGP";
  const subtotal = invoice.subtotal || 0;
  const addition = invoice.addition || 0;
  const discount = invoice.discount || 0;
  const salesTax = invoice.salesTax || 0;
  const serviceTax = invoice.serviceTax || 0;
  const deliveryFee = invoice.deliveryFee || 0;

  const discountAccount = settings.activities?.sales?.discount;
  const serviceChargeAccount = settings.activities?.sales?.serviceCharge;
  const deliveryFeeAccount = settings.activities?.sales?.deliveryFee;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines: any[] = [];
  let revenueCredit = subtotal + addition;

  if (discount > 0) {
    if (discountAccount) {
      lines.push(journalLine(discountAccount, `Invoice ${invoice.serial} - discount`, discount, 0, currency));
    } else {
      revenueCredit -= discount;
    }
  }

  if (salesTax > 0) {
    lines.push(journalLine(settings.activities.sales.tax, `Invoice ${invoice.serial} - sales tax`, 0, salesTax, currency));
  }

  if (serviceTax > 0) {
    if (serviceChargeAccount) {
      lines.push(journalLine(serviceChargeAccount, `Invoice ${invoice.serial} - service charge`, 0, serviceTax, currency));
    } else {
      revenueCredit += serviceTax;
    }
  }

  if (deliveryFee > 0) {
    if (deliveryFeeAccount) {
      lines.push(journalLine(deliveryFeeAccount, `Invoice ${invoice.serial} - delivery fee`, 0, deliveryFee, currency));
    } else {
      revenueCredit += deliveryFee;
    }
  }

  if (revenueCredit > 0) {
    lines.unshift(journalLine(settings.activities.sales.revenue, `Invoice ${invoice.serial} - revenue`, 0, revenueCredit, currency));
  }

  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const totalDebitSoFar = lines.reduce((sum, l) => sum + l.debit, 0);
  // Balances the entry by construction: cash absorbs whatever the credit side committed to minus
  // what's already been debited (the discount line, if any) — independent of the client-supplied
  // `invoice.total`, which PLATFORM_FINAL_AUDIT.md PA-04 documents as not yet server-recalculated.
  const cashDebit = totalCredit - totalDebitSoFar;

  if (cashDebit <= 0) {
    return null;
  }

  lines.push(journalLine(settings.controlAccounts.cash, `Invoice ${invoice.serial} - cash collected`, cashDebit, 0, currency));

  return lines;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class InvoiceService extends BaseRepository<any> {
  constructor() {
    super(InvoiceModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-03, corrected: Invoice is a transactional
      // fiscal document with its own status lifecycle (OPEN/PAID/
      // PARTIALLY_RETURNED/FULLY_RETURNED/CANCELLED) — soft-delete is not
      // the right model for it (see order.service.ts).
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "cashierShift", "cashier", "deliveryMan", "order", "paidBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  // DB-007: server-generates `serial` instead of trusting a client-supplied value — makes the
  // {brand,branch,serial} unique index (DB-003) collision-free in practice. `invoice.validation.js`
  // now excludes `serial` from client input (stripped, not rejected — old clients stay compatible).
  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const brandId = data.brand as string | undefined;
    const branchId = data.branch as string | undefined;

    if (!brandId || !branchId) {
      throwError("brand and branch are required to generate an invoice serial.", 400);
    }

    const serial = await invoiceSettingsService.getNextInvoiceSerial(brandId!, branchId!);

    return { ...data, serial };
  }

  /**
   * Journal Entry Posting Engine (V4.0): every Sales Invoice attempts to post its accounting
   * impact immediately on creation. Deliberately non-blocking — a brand that hasn't configured
   * AccountingSettings yet, or has no open AccountingPeriod for today, still gets a working
   * invoice; the posting is simply skipped (logged) and can be posted later once the owner
   * finishes configuring the accounting engine. Making this a hard dependency of invoice creation
   * would be a breaking-behavior regression for every brand not yet using the accounting module.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(opts: any) {
    const invoice = await super.create(opts);

    try {
      const settings = await accountingSettingService.resolveForPosting(invoice.brand, invoice.branch);
      const lines = buildSalesInvoiceLines(invoice, settings);

      if (lines) {
        const { entry } = await journalEntryService.postFromSource({
          sourceType: "SALES_INVOICE",
          brand: invoice.brand,
          branch: invoice.branch,
          date: invoice.payment_date || invoice.createdAt || new Date(),
          description: `Sales Invoice ${invoice.serial}`,
          lines,
          createdBy: opts.createdBy,
          sourceRef: invoice._id,
        });

        invoice.journalEntry = entry._id;
        await invoice.save();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[invoice.service] Sales journal entry not posted for invoice ${invoice._id}: ${(err as Error).message}`,
      );
    }

    return invoice;
  }
}

export default new InvoiceService();
