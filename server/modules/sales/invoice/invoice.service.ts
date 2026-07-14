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
import taxConfigServiceJs from "../../system/tax-settings/tax-config.service.js";
import serviceChargeServiceJs from "../../system/service-charge-settings/service-charge.service.js";
import discountSettingsServiceJs from "../../system/discount-settings/discount-settings.service.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const accountingSettingService = accountingSettingServiceJs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const journalEntryService = journalEntryServiceJs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const taxConfigService = taxConfigServiceJs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serviceChargeService = serviceChargeServiceJs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const discountSettingsService = discountSettingsServiceJs as any;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function applyRounding(value: number, mode: string): number {
  if (mode === "UP") return Math.ceil(value * 100) / 100;
  if (mode === "DOWN") return Math.floor(value * 100) / 100;
  return round2(value);
}

/**
 * V4.0 Invoice Pricing Engine (PLATFORM_FINAL_AUDIT.md PA-04).
 *
 * Recomputes an invoice's financial aggregates server-side from its own line items + the brand's
 * TaxConfig/ServiceCharge/DiscountSettings — the client can no longer set `subtotal`/`salesTax`/
 * `serviceTax`/`total` directly; only `items[]` (still client-trusted at the per-line level — see
 * the "not attempted" note below) and a proposed `discount`/`addition`/`deliveryFee` are input.
 *
 * Handles: tax-inclusive vs tax-exclusive pricing, tax computed before-or-after discount
 * (`TaxConfig.calculationMethod`), service charge as a percentage or fixed amount with a
 * before/after-tax base and 3 rounding modes, and a manual-discount policy (`DiscountSettings`)
 * that rejects a discount above `maxManualDiscount`/`approvalThreshold` unless the caller supplies
 * `discountApprovedBy`.
 *
 * NOT attempted here (documented limitation, not a silent gap): per-line `price`/`priceAfterDiscount`
 * values are still whatever the caller sends — validating each line's price against the Product
 * catalog would require joining Invoice's item shape to the Product/Recipe pricing system, which
 * doesn't exist as a callable service yet. This engine closes the "arbitrary total" hole (PA-04's
 * literal finding); catalog-price validation is a separate, larger follow-up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeInvoicePricing(input: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  discount?: number;
  addition?: number;
  deliveryFee?: number;
  discountApprovedBy?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taxConfig: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceChargeConfig: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  discountSettings: any;
}) {
  const items = input.items || [];
  const subtotal = round2(
    items.reduce((sum, item) => sum + (item.totalprice || 0) + (item.totalExtrasPrice || 0), 0),
  );

  const discount = round2(input.discount || 0);
  const addition = round2(input.addition || 0);
  const deliveryFee = round2(input.deliveryFee || 0);

  if (discount > 0 && input.discountSettings) {
    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const threshold = Math.min(
      input.discountSettings.maxManualDiscount ?? 100,
      input.discountSettings.approvalThreshold ?? 100,
    );

    if (discountPercent > threshold && input.discountSettings.requireManagerApproval && !input.discountApprovedBy) {
      throwError(
        `Discount of ${discountPercent.toFixed(2)}% exceeds the ${threshold}% manager-approval ` +
          "threshold. Provide discountApprovedBy to proceed.",
        403,
      );
    }
    if (discountPercent > (input.discountSettings.maxManualDiscount ?? 100) && !input.discountApprovedBy) {
      throwError(
        `Discount of ${discountPercent.toFixed(2)}% exceeds the maximum allowed manual discount ` +
          `(${input.discountSettings.maxManualDiscount}%).`,
        403,
      );
    }
  }

  const taxConfig = input.taxConfig || {};
  const taxableBase =
    taxConfig.calculationMethod === "AFTER_DISCOUNT" ? Math.max(subtotal - discount, 0) : subtotal;

  let salesTax = 0;
  if (taxConfig.enabled && taxConfig.percentage > 0) {
    salesTax = taxConfig.pricesIncludeTax
      ? round2(taxableBase - taxableBase / (1 + taxConfig.percentage / 100))
      : round2(taxableBase * (taxConfig.percentage / 100));
  }

  const serviceChargeConfig = input.serviceChargeConfig || {};
  let serviceTax = 0;
  if (serviceChargeConfig.enabled) {
    const base = serviceChargeConfig.calculationBase === "AFTER_TAX" ? taxableBase + salesTax : taxableBase;
    const raw = serviceChargeConfig.type === "FIXED" ? serviceChargeConfig.value : base * (serviceChargeConfig.value / 100);
    serviceTax = applyRounding(raw, serviceChargeConfig.roundingMode);
  }

  // When prices already include tax, `salesTax` is disclosed for reporting/accounting but is
  // already embedded in `subtotal` — adding it again here would double-count it in `total`.
  const taxAddOn = taxConfig.pricesIncludeTax ? 0 : salesTax;
  const total = round2(subtotal - discount + addition + taxAddOn + serviceTax + deliveryFee);

  return {
    subtotal,
    discount,
    addition,
    salesTax,
    serviceTax,
    deliveryFee,
    total,
    taxInclusive: Boolean(taxConfig.pricesIncludeTax),
  };
}

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

  // When the invoice's pricing was computed with TaxConfig.pricesIncludeTax, `subtotal` already
  // has the tax portion embedded in it — crediting the full subtotal to Revenue AND separately
  // crediting `salesTax` to Tax Payable below would double-count that portion. Extracting it here
  // keeps Revenue at the tax-exclusive amount, matching the separate Tax Payable credit.
  if (invoice.taxInclusive && salesTax > 0) {
    revenueCredit -= salesTax;
  }

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
  //
  // V4.0 Invoice Pricing Engine (PA-04): also recomputes subtotal/salesTax/serviceTax/total from
  // `items[]` + TaxConfig/ServiceCharge/DiscountSettings, replacing whatever the client sent for
  // those four fields — see computeInvoicePricing() above for the full calculation. `discount`/
  // `addition`/`deliveryFee` remain caller-supplied inputs (a manual discount, a delivery fee from
  // the delivery module) but `discount` is validated against DiscountSettings' approval policy.
  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const brandId = data.brand as string | undefined;
    const branchId = data.branch as string | undefined;

    if (!brandId || !branchId) {
      throwError("brand and branch are required to generate an invoice serial.", 400);
    }

    const serial = await invoiceSettingsService.getNextInvoiceSerial(brandId!, branchId!);

    const [taxConfig, serviceChargeConfig, discountSettings] = await Promise.all([
      taxConfigService.resolveForBrandBranch(brandId, branchId),
      serviceChargeService.resolveForBrandBranch(brandId, branchId),
      discountSettingsService.resolveForBrandBranch(brandId, branchId),
    ]);

    const pricing = computeInvoicePricing({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (data.items as any[]) || [],
      discount: data.discount as number | undefined,
      addition: data.addition as number | undefined,
      deliveryFee: data.deliveryFee as number | undefined,
      discountApprovedBy: data.discountApprovedBy as string | undefined,
      taxConfig,
      serviceChargeConfig,
      discountSettings,
    });

    return { ...data, serial, ...pricing };
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
