import PurchaseInvoiceModel from "./purchase-invoice.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import purchaseSettingsService from "../purchasing-settings/purchase-settings.service.js";
import supplierTransactionService from "../supplier-transaction/supplier-transaction.service.js";
import SupplierModel from "../supplier/supplier.model.js";
import CashRegisterModel from "../../finance/cash-register/cash-register.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";
import threeWayMatchService from "../three-way-match/three-way-match.service.js";

// SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.3 — once Completed, only a PurchaseReturnInvoice
// can reverse it (same immutable-posted-document convention as JournalEntry).
const transitionGuard = createTransitionGuard({
  Draft: ["Review", "Approved", "Cancelled"],
  Review: ["Approved", "Rejected", "Cancelled"],
  Approved: ["Completed", "Cancelled"],
  Completed: [],
  Rejected: [],
  Cancelled: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

/**
 * Journal Entry Posting Engine — Purchase Invoice mapping. Mirrors buildSalesInvoiceLines in
 * invoice.service.ts exactly (same balance-by-construction technique, same
 * fold-into-primary-line-when-no-dedicated-account fallback) — the debit/credit sides are simply
 * reversed, since a purchase is the accounting mirror of a sale: we're acquiring an asset
 * (Inventory) and incurring a liability (Accounts Payable), not recognizing revenue and collecting
 * cash. Exported (not a class-private method) so it's unit-testable without a live invoice.
 */
export function buildPurchaseInvoiceLines(purchaseInvoice, settings) {
  const currency = settings.currencySettings?.baseCurrency || "EGP";
  const grossAmount = purchaseInvoice.grossAmount || 0;
  const invoiceDiscount = purchaseInvoice.invoiceDiscount || 0;
  const totalTax = purchaseInvoice.totalTax || 0;

  const inventoryAccount = settings.activities?.purchase?.inventory;
  const taxAccount = settings.activities?.purchase?.tax;
  const discountAccount = settings.activities?.purchase?.discount;

  const lines = [];
  let inventoryDebit = grossAmount;

  // Same tax-inclusive extraction as the sales side — if the invoice's amounts already embed tax,
  // debiting the full gross amount to Inventory AND separately debiting totalTax to Tax
  // Recoverable would double-count that portion.
  if (purchaseInvoice.isTaxInclusive && totalTax > 0) {
    inventoryDebit -= totalTax;
  }

  if (invoiceDiscount > 0) {
    if (discountAccount) {
      lines.push(journalLine(discountAccount, `Purchase Invoice ${purchaseInvoice.invoiceNumber} - discount`, 0, invoiceDiscount, currency));
    } else {
      inventoryDebit -= invoiceDiscount;
    }
  }

  if (totalTax > 0 && taxAccount) {
    lines.push(journalLine(taxAccount, `Purchase Invoice ${purchaseInvoice.invoiceNumber} - purchase tax`, totalTax, 0, currency));
  }

  if (inventoryDebit > 0) {
    lines.unshift(journalLine(inventoryAccount, `Purchase Invoice ${purchaseInvoice.invoiceNumber} - inventory`, inventoryDebit, 0, currency));
  }

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCreditSoFar = lines.reduce((sum, l) => sum + l.credit, 0);
  // Balances the entry by construction: Accounts Payable absorbs whatever the debit side
  // committed to, minus what's already been credited (the discount line, if any).
  const payableCredit = totalDebit - totalCreditSoFar;

  if (payableCredit <= 0) {
    return null;
  }

  lines.push(journalLine(settings.controlAccounts.accountsPayable, `Purchase Invoice ${purchaseInvoice.invoiceNumber} - accounts payable`, 0, payableCredit, currency));

  return lines;
}

class PurchaseInvoiceService extends AdvancedService {
  constructor() {
    super(PurchaseInvoiceModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-05: transactional document, status lifecycle instead of soft-delete.
      enableSoftDelete: false,
      defaultPopulate: [
        "brand", "branch", "returnInvoice", "supplier", "purchaseOrder", "goodsReceiptNotes",
        "warehouseForAllItems", "taxes", "costCenter", "createdBy", "updatedBy",
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const policy = await purchaseSettingsService.resolveProcurementPolicy(data.brand, data.branch);

    if (policy.raw?.purchase?.requireSupplierInvoiceNumber && !data.supplierInvoiceNumber) {
      throwError("A supplier invoice number is required by this brand's purchasing policy.", 400);
    }

    if (policy.enforceSupplierCreditLimit) {
      const supplier = await SupplierModel.findOne({ _id: data.supplier, brand: data.brand }).lean();
      if (supplier?.creditLimit > 0) {
        const currentBalance = await supplierTransactionService.getCurrentBalance(data.brand, data.supplier);
        const netAmount = data.netAmount || 0;
        if (currentBalance + netAmount > supplier.creditLimit) {
          throwError(
            `This invoice would exceed ${data.supplier}'s credit limit (current balance ${currentBalance}, limit ${supplier.creditLimit}).`,
            409,
          );
        }
      }
    }

    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber && policy.raw) {
      invoiceNumber = await sequenceGenerator.getNext({
        Model: purchaseSettingsService.model,
        filter: { _id: policy.raw._id },
        sequenceField: "purchase.sequence",
      });
    }
    if (!invoiceNumber) {
      throwError("No PurchasingSettings configured for this brand/branch — cannot generate an invoice number.", 422);
    }

    // Three-Way Matching Engine (Supply Chain & Commerce Platform V5.1) — runs BEFORE the invoice
    // is even created when a PurchaseOrder is referenced, so `blockOnMatchVariance` can prevent a
    // variance invoice from ever being recorded, not just flag it after the fact.
    const matchReport = await threeWayMatchService.matchAgainstPayload({
      brand: data.brand,
      purchaseOrderId: data.purchaseOrder,
      goodsReceiptNoteIds: data.goodsReceiptNotes,
      items: data.items || [],
      toleranceRate: policy.matchToleranceRate,
    });
    if (matchReport.status === "VARIANCE" && policy.blockOnMatchVariance) {
      throwError(
        `Three-way match found variances and this brand's policy blocks completion on variance: ${matchReport.lines.filter((l) => l.exceptions.length).map((l) => l.exceptions.map((e) => e.detail).join(" ")).join(" ")}`,
        409,
      );
    }

    return {
      ...data,
      invoiceNumber,
      balanceDue: data.balanceDue ?? data.netAmount ?? 0,
      threeWayMatchStatus: matchReport.status,
    };
  }

  /**
   * Posts to the GL and the supplier AP ledger the moment an invoice reaches Completed — either
   * immediately on create() (the model's existing default status, preserving today's exact
   * behavior for callers that don't manage an explicit Draft/Review/Approved workflow) or via
   * transition(). Same non-blocking, best-effort posting philosophy already proven correct by
   * invoice.service.ts's Sales side — an unconfigured AccountingSettings must not block a
   * purchase from being recorded.
   */
  async _postAccounting(purchaseInvoice, actorId) {
    try {
      const settings = await accountingSettingService.resolveForPosting(purchaseInvoice.brand, purchaseInvoice.branch);
      const lines = buildPurchaseInvoiceLines(purchaseInvoice, settings);

      if (lines) {
        const { entry } = await journalEntryService.postFromSource({
          sourceType: "PURCHASE_INVOICE",
          brand: purchaseInvoice.brand,
          branch: purchaseInvoice.branch,
          date: purchaseInvoice.invoiceDate || purchaseInvoice.createdAt || new Date(),
          description: `Purchase Invoice ${purchaseInvoice.invoiceNumber}`,
          lines,
          createdBy: actorId,
          sourceRef: purchaseInvoice._id,
        });

        purchaseInvoice.journalEntry = entry._id;
        purchaseInvoice.accountingPosted = true;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[purchase-invoice.service] Journal entry not posted for invoice ${purchaseInvoice._id}: ${err.message}`);
    }

    try {
      await supplierTransactionService.record({
        brand: purchaseInvoice.brand,
        branch: purchaseInvoice.branch,
        supplier: purchaseInvoice.supplier,
        transactionType: "Purchase",
        amount: purchaseInvoice.netAmount,
        description: `Purchase Invoice ${purchaseInvoice.invoiceNumber}`,
        invoiceModel: "PurchaseInvoice",
        reffrance: purchaseInvoice._id,
        recordedBy: actorId,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[purchase-invoice.service] Supplier transaction not recorded for invoice ${purchaseInvoice._id}: ${err.message}`);
    }

    await purchaseInvoice.save();
  }

  async afterCreate(document) {
    if (document.status === "Completed") {
      await this._postAccounting(document, document.createdBy);
    }
    return document;
  }

  async transition({ id, brand, branch, toStatus, actorId }) {
    const invoice = await this.model.findOne({ _id: id, brand, branch });
    if (!invoice) throwError("Purchase invoice not found.", 404);

    transitionGuard.assertValid(invoice.status, toStatus);

    // V6.0 Production Hardening: atomic claim, not read-then-save — closes the same TOCTOU race
    // already fixed on GoodsReceiptNote.confirm()/PurchaseOrder.transition(). Here specifically,
    // two concurrent calls both reaching "Completed" would otherwise both call _postAccounting(),
    // which posts a real AP-ledger entry — see supplierTransactionService.record()'s own
    // idempotency guard (added alongside this fix) for the second layer of protection.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: invoice.status },
      { $set: { status: toStatus } },
      { new: true },
    );
    if (!claimed) {
      throwError("This purchase invoice was already transitioned by a concurrent request.", 409);
    }

    if (toStatus === "Completed") {
      await this._postAccounting(claimed, actorId);
    }

    return claimed;
  }

  /**
   * Supply Chain & Commerce Platform V5 — Supplier Payment step. Records a Payment-type
   * SupplierTransaction (reducing the AP balance) and atomically decrements this invoice's own
   * `balanceDue`, marking it fully paid once the balance reaches zero. Deliberately does NOT go
   * through the full PaymentIntent/PaymentTransaction/Adapter architecture designed in
   * SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §3 — that's explicitly scoped as its own, larger
   * milestone track (M-Payment-1/2/3) with its own open business decisions; this is the minimal,
   * correct closing of the AP ledger loop that doesn't require any of that to exist first.
   */
  async recordPayment({ id, brand, branch, amount, paymentMethod, cashRegister = null, reference = null, actorId }) {
    if (!amount || amount <= 0) throwError("Payment amount must be greater than zero.", 400);

    const invoice = await this.model.findOne({ _id: id, brand, branch });
    if (!invoice) throwError("Purchase invoice not found.", 404);
    if (invoice.status !== "Completed") throwError("Only a completed invoice can receive a payment.", 409);
    if (invoice.isFullyPaid) throwError("This invoice is already fully paid.", 409);
    if (amount > invoice.balanceDue) throwError(`Payment amount (${amount}) exceeds the remaining balance due (${invoice.balanceDue}).`, 400);

    const updated = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, balanceDue: { $gte: amount } },
      {
        $inc: { balanceDue: -amount },
        $push: { payments: { paymentMethod, amount, cashRegister, reference, paymentDate: new Date() } },
      },
      { new: true },
    );
    if (!updated) throwError("Payment could not be applied — the invoice's balance may have changed concurrently.", 409);

    if (updated.balanceDue <= 0) {
      updated.isFullyPaid = true;
      await updated.save();
    }

    await supplierTransactionService.record({
      brand,
      branch,
      supplier: invoice.supplier,
      transactionType: "Payment",
      amount,
      description: `Payment against Purchase Invoice ${invoice.invoiceNumber}`,
      invoiceModel: "PurchaseInvoice",
      reffrance: invoice._id,
      paymentMethod,
      recordedBy: actorId,
    });

    // GL posting for the cash/bank outflow — previously this method only updated the AP
    // sub-ledger (supplierTransactionService above), leaving the settling cash movement itself
    // invisible in the general ledger. Debit AP (the liability shrinks), credit the cash/bank
    // account the payment actually left from — best-effort/non-blocking, matching every other
    // posting call site in this platform. `sourceRef` is the just-pushed payment subdocument's own
    // `_id` (a real, distinct ObjectId per payment — `JournalLine.sourceRef` is strictly typed
    // ObjectId, so a composite string is not an option), correctly scoping the idempotency guard
    // to "this one payment," not the whole invoice — an invoice legitimately receives multiple
    // partial payments, each its own cash movement.
    try {
      const justPaid = updated.payments[updated.payments.length - 1];
      await this._postPaymentAccounting({
        brand, branch, invoice: updated, amount, cashRegister, actorId,
        sourceRef: justPaid._id,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[purchase-invoice.service] Payment journal entry not posted for invoice ${invoice._id}: ${err.message}`);
    }

    return updated;
  }

  /**
   * Resolves which GL cash/bank account a payment/refund actually moves through: the specific
   * `CashRegister.accountId` when one was supplied (the accurate answer — a payment from the
   * branch safe and one from a specific POS drawer are different accounts), falling back to
   * `controlAccounts.cash` — the same simplification `invoice.service.ts#buildSalesInvoiceLines`
   * already uses on the sales side — only when no register is specified.
   */
  async _resolveCashAccount(cashRegister, settings) {
    if (cashRegister) {
      const register = await CashRegisterModel.findById(cashRegister).select("accountId").lean();
      if (register?.accountId) return register.accountId;
    }
    return settings.controlAccounts?.cash;
  }

  /**
   * Debit AP / Credit Cash-or-Bank — the settlement of a supplier payment. `sourceRef` is per
   * payment (not per invoice), since one invoice can receive multiple partial payments, each of
   * which is its own distinct cash movement and must post its own journal entry.
   */
  async _postPaymentAccounting({ brand, branch, invoice, amount, cashRegister, actorId, sourceRef }) {
    const settings = await accountingSettingService.resolveForPosting(brand, branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const accountsPayable = settings.controlAccounts?.accountsPayable;
    const cashAccount = await this._resolveCashAccount(cashRegister, settings);
    if (!accountsPayable || !cashAccount) return;

    const description = `Payment against Purchase Invoice ${invoice.invoiceNumber}`;
    const lines = [
      journalLine(accountsPayable, description, amount, 0, currency),
      journalLine(cashAccount, description, 0, amount, currency),
    ];

    await journalEntryService.postFromSource({
      sourceType: "PURCHASE_PAYMENT",
      brand, branch,
      date: new Date(),
      description,
      lines,
      createdBy: actorId,
      sourceRef,
    });
  }
}

export default new PurchaseInvoiceService();
export { transitionGuard as purchaseInvoiceTransitionGuard };
