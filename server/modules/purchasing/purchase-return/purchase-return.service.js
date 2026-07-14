import PurchaseReturnInvoiceModel from "./purchase-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import purchaseSettingsService from "../purchasing-settings/purchase-settings.service.js";
import supplierTransactionService from "../supplier-transaction/supplier-transaction.service.js";
import warehouseDocumentService from "../../inventory/warehouse-document/warehouse-document.service.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";
import PurchaseInvoiceModel from "../purchase-invoice/purchase-invoice.model.js";

/**
 * SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.3 — the enum has no separate "Approved" state; the
 * act of approving a return IS the transition to whichever refund status immediately applies
 * (`Partially Refunded` if cash/credit refund is still pending, `Fully Refunded` if the refund
 * type is `deduct_supplier_balance`, which settles instantly via the AP ledger — no separate cash
 * movement to wait for). This is a deliberate reuse of the existing enum rather than inventing a
 * new "Approved" state the model didn't already have.
 */
const transitionGuard = createTransitionGuard({
  Draft: ["Review", "Cancelled"],
  Review: ["Partially Refunded", "Fully Refunded", "Rejected", "Cancelled"],
  "Partially Refunded": ["Fully Refunded"],
  "Fully Refunded": [],
  Rejected: [],
  Cancelled: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

/**
 * Journal Entry Posting Engine — Purchase Return mapping. The accounting mirror of
 * buildPurchaseInvoiceLines: debits Accounts Payable (the liability shrinks) and credits
 * Inventory/Tax-Recoverable-contra (the asset shrinks) — exactly reversed from the original
 * purchase, balanced by construction.
 */
export function buildPurchaseReturnLines(purchaseReturn, settings) {
  const currency = settings.currencySettings?.baseCurrency || "EGP";
  const netAmount = purchaseReturn.netAmount || 0;
  const taxAmount = purchaseReturn.taxAmount || 0;
  if (netAmount <= 0) return null;

  const inventoryContraAccount = settings.activities?.purchaseReturn?.inventoryContra;
  const taxContraAccount = settings.activities?.purchaseReturn?.taxContra;

  const lines = [];
  let inventoryCredit = netAmount;

  if (taxAmount > 0 && taxContraAccount) {
    lines.push(journalLine(taxContraAccount, `Purchase Return ${purchaseReturn.invoiceNumber} - tax reversal`, 0, taxAmount, currency));
    inventoryCredit -= taxAmount;
  }

  if (inventoryCredit > 0) {
    lines.push(journalLine(inventoryContraAccount, `Purchase Return ${purchaseReturn.invoiceNumber} - inventory reversal`, 0, inventoryCredit, currency));
  }

  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (totalCredit <= 0) return null;

  lines.unshift(journalLine(settings.controlAccounts.accountsPayable, `Purchase Return ${purchaseReturn.invoiceNumber} - accounts payable reversal`, totalCredit, 0, currency));
  return lines;
}

class PurchaseReturnService extends AdvancedService {
  constructor() {
    super(PurchaseReturnInvoiceModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-05, corrected: transactional document, already has
      // Draft/Review/Partially Refunded/Fully Refunded/Rejected/Cancelled — see asset.service.js.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "originalInvoice", "warehouseForAllItems", "supplier", "taxes", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const policy = await purchaseSettingsService.resolveProcurementPolicy(data.brand, data.branch);

    if (policy.raw?.purchaseReturn?.requireOriginalInvoice && !data.originalInvoice) {
      throwError("An original purchase invoice reference is required by this brand's return policy.", 400);
    }

    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber && policy.raw) {
      invoiceNumber = await sequenceGenerator.getNext({
        Model: purchaseSettingsService.model,
        filter: { _id: policy.raw._id },
        sequenceField: "purchaseReturn.sequence",
      });
    }
    if (!invoiceNumber) {
      throwError("No PurchasingSettings configured for this brand/branch — cannot generate a return invoice number.", 422);
    }

    const refundType = data.refundType || policy.raw?.purchaseReturn?.defaultRefundType || "cash";

    await this._assertReturnedQuantitiesWithinInvoiced(data);

    return { ...data, invoiceNumber, refundType, balanceDue: data.balanceDue ?? data.netAmount ?? 0, status: "Draft" };
  }

  /**
   * V5.2 Workflow Integrity: a supplier return can only give back what was actually invoiced/
   * received in the first place. Before this guard, `approve()` would happily post an OUT
   * WarehouseDocument for any quantity in `returnedItems`, with no comparison against the
   * originating PurchaseInvoice's line quantities — so a return could exceed what was ever
   * received, silently driving inventory negative (or worse, appearing to be legitimate stock
   * loss). Sums this return's requested quantities together with every *other* non-terminal
   * return already recorded against the same original invoice (a second, third... partial return
   * of the same delivery is legitimate; only the cumulative total is bounded).
   */
  async _assertReturnedQuantitiesWithinInvoiced(data) {
    const invoice = await PurchaseInvoiceModel.findOne({ _id: data.originalInvoice, brand: data.brand }).select("items invoiceNumber").lean();
    if (!invoice) throwError("The original purchase invoice referenced by this return no longer exists.", 404);

    const invoicedByItem = new Map();
    for (const line of invoice.items || []) {
      const key = String(line.itemId);
      invoicedByItem.set(key, (invoicedByItem.get(key) || 0) + line.quantity);
    }

    const priorReturns = await this.model
      .find({ originalInvoice: data.originalInvoice, brand: data.brand, status: { $nin: ["Rejected", "Cancelled"] } })
      .select("returnedItems")
      .lean();

    const alreadyReturnedByItem = new Map();
    for (const priorReturn of priorReturns) {
      for (const line of priorReturn.returnedItems || []) {
        const key = String(line.itemId);
        alreadyReturnedByItem.set(key, (alreadyReturnedByItem.get(key) || 0) + line.quantity);
      }
    }

    for (const item of data.returnedItems || []) {
      const key = String(item.itemId);
      const invoicedQuantity = invoicedByItem.get(key) || 0;
      const alreadyReturned = alreadyReturnedByItem.get(key) || 0;
      const totalAfterThisReturn = alreadyReturned + item.quantity;
      if (totalAfterThisReturn > invoicedQuantity) {
        throwError(
          `Cannot return ${item.quantity} of item ${key}: only ${invoicedQuantity - alreadyReturned} remaining returnable ` +
            `(invoiced ${invoicedQuantity}, already returned ${alreadyReturned}) on invoice ${invoice.invoiceNumber}.`,
          409,
        );
      }
    }
  }

  /**
   * The one place a purchase return actually reverses inventory and accounting — reuses both
   * existing engines (WarehouseDocument posting, Journal Entry posting), never reimplements
   * either, exactly like goods-receipt-note.service.js#confirm does for the forward direction.
   */
  async approve({ id, brand, branch, actorId }) {
    const policy = await purchaseSettingsService.resolveProcurementPolicy(brand, branch);
    const ret = await this.model.findOne({ _id: id, brand, branch });
    if (!ret) throwError("Purchase return invoice not found.", 404);

    const isFullySettledOnApproval = ret.refundType === "deduct_supplier_balance";
    const targetStatus = isFullySettledOnApproval ? "Fully Refunded" : "Partially Refunded";
    transitionGuard.assertValid(ret.status, targetStatus);

    // V5.2 Workflow Integrity: atomic claim BEFORE any side effect — same TOCTOU race and same
    // fix as goods-receipt-note.service.js#confirm. Without this, two concurrent approve() calls
    // for the same return could both pass assertValid() above and each post their own reversing
    // WarehouseDocument/JournalEntry: a double inventory reversal and double AP credit for one
    // physical return.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: ret.status },
      { $set: { status: targetStatus, ...(isFullySettledOnApproval ? { balanceDue: 0 } : {}) } },
    );
    if (!claimed) {
      throwError("This purchase return was already processed by a concurrent request.", 409);
    }

    if (policy.raw?.purchaseReturn?.returnAffectsInventory !== false && ret.returnedItems?.length) {
      const warehouseDocument = await warehouseDocumentService.create({
        brandId: brand,
        branchId: branch,
        createdBy: actorId,
        data: {
          branch,
          documentType: "OUT",
          postingDate: new Date(),
          transactionType: "ReturnPurchase",
          documentNumber: `WD-${ret.invoiceNumber}`,
          sourceWarehouse: ret.warehouseForAllItems || ret.returnedItems[0].warehouse,
          items: ret.returnedItems.map((item) => ({
            stockItem: item.itemId,
            quantity: item.quantity,
            unitCost: item.price,
            totalCost: item.quantity * item.price,
          })),
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: warehouseDocument._id, brand, branch, postedBy: actorId });
    }

    try {
      const settings = await accountingSettingService.resolveForPosting(brand, branch);
      const lines = buildPurchaseReturnLines(ret, settings);
      if (lines) {
        const { entry } = await journalEntryService.postFromSource({
          sourceType: "PURCHASE_RETURN",
          brand, branch,
          date: ret.invoiceDate || new Date(),
          description: `Purchase Return ${ret.invoiceNumber}`,
          lines,
          createdBy: actorId,
          sourceRef: ret._id,
        });
        ret.journalEntry = entry._id;
        ret.accountingPosted = true;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[purchase-return.service] Journal entry not posted for return ${ret._id}: ${err.message}`);
    }

    try {
      await supplierTransactionService.record({
        brand, branch, supplier: ret.supplier,
        transactionType: "PurchaseReturn",
        amount: ret.netAmount,
        description: `Purchase Return ${ret.invoiceNumber}`,
        invoiceModel: "PurchaseReturnInvoice",
        reffrance: ret._id,
        recordedBy: actorId,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[purchase-return.service] Supplier transaction not recorded for return ${ret._id}: ${err.message}`);
    }

    // status/balanceDue were already atomically claimed above; only the winning caller reaches
    // this point, so persisting them again here (alongside journalEntry/accountingPosted) is not
    // racy — it's the same winner's own write, not a second competing one.
    ret.status = targetStatus;
    if (isFullySettledOnApproval) ret.balanceDue = 0;
    await ret.save();

    return ret;
  }

  async transition({ id, brand, branch, toStatus, actorId }) {
    if (["Partially Refunded", "Fully Refunded"].includes(toStatus)) {
      // The only path to these two states is approve() — it posts inventory/accounting as part
      // of the same action, which a bare status-field PUT must not be able to bypass.
      return this.approve({ id, brand, branch, actorId });
    }

    const ret = await this.model.findOne({ _id: id, brand, branch });
    if (!ret) throwError("Purchase return invoice not found.", 404);
    transitionGuard.assertValid(ret.status, toStatus);
    ret.status = toStatus;
    await ret.save();
    return ret;
  }

  /** Cash/credit refund settlement — mirrors purchase-invoice.service.js#recordPayment exactly. */
  async recordRefund({ id, brand, branch, amount, refundMethod, cashRegister = null, reference = null, actorId }) {
    if (!amount || amount <= 0) throwError("Refund amount must be greater than zero.", 400);

    const ret = await this.model.findOne({ _id: id, brand, branch });
    if (!ret) throwError("Purchase return invoice not found.", 404);
    if (ret.status !== "Partially Refunded") throwError("Only a return awaiting refund can receive a refund payment.", 409);
    if (amount > ret.balanceDue) throwError(`Refund amount (${amount}) exceeds the remaining balance due (${ret.balanceDue}).`, 400);

    const updated = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, balanceDue: { $gte: amount } },
      {
        $inc: { balanceDue: -amount },
        $push: { refundTransactions: { amount, refundMethod, cashRegister, reference, refundDate: new Date() } },
      },
      { new: true },
    );
    if (!updated) throwError("Refund could not be applied — the return's balance may have changed concurrently.", 409);

    if (updated.balanceDue <= 0) {
      updated.status = "Fully Refunded";
      await updated.save();
    }

    return updated;
  }
}

export default new PurchaseReturnService();
export { transitionGuard as purchaseReturnTransitionGuard };
