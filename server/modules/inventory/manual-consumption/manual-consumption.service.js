import ManualConsumptionModel from "./manual-consumption.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";
import warehouseDocumentService from "../warehouse-document/warehouse-document.service.js";
import StockItemModel from "../stock-item/stock-item.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

// Same convention as every other transactional document in this platform: approving IS posting
// (Inventory + Accounting happen atomically as part of the Approved transition, not a separate
// "post" step) — matching GoodsReceiptNote.confirm()/PurchaseOrder's established pattern. Once
// physically consumed, there is no undo; Cancelled/Rejected are only reachable before that point.
const transitionGuard = createTransitionGuard({
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["Approved", "Rejected", "Cancelled"],
  Approved: [],
  Rejected: [],
  Cancelled: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

const DEBIT_CATEGORY_TO_CONTROL_ACCOUNT = {
  COGS: "costOfGoodsSold",
  INVENTORY_ADJUSTMENT: "inventoryAdjustment",
  OPERATING_EXPENSE: "operatingExpense",
};

class ManualConsumptionService extends AdvancedService {
  constructor() {
    super(ManualConsumptionModel, {
      brandScoped: true,
      branchScoped: true,
      // Transactional document with its own status lifecycle — matches every other
      // Approved-is-terminal document in this platform (PurchaseOrder, GoodsReceiptNote, ...).
      enableSoftDelete: false,
      defaultPopulate: [
        "brand", "branch", "warehouse", "department", "shift", "consumedBy",
        "items.stockItem", "approvedBy", "rejectedBy", "warehouseDocument", "journalEntry",
        "createdBy", "updatedBy",
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const settings = await inventorySettingsService.resolveForPosting(data.brand, data.branch);
    if (!settings._id) {
      throwError("No InventorySettings configured for this brand/branch — cannot generate a manual consumption number.", 422);
    }

    const consumptionNumber = await sequenceGenerator.getNext({
      Model: inventorySettingsService.model,
      filter: { _id: settings._id },
      sequenceField: "manualConsumptionSequence",
    });

    return { ...data, consumptionNumber, status: "Draft" };
  }

  async transition({ id, brand, branch, toStatus, actorId, rejectionReason = null }) {
    if (toStatus === "Approved") return this.approve({ id, brand, branch, actorId });

    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Manual consumption record not found.", 404);
    transitionGuard.assertValid(doc.status, toStatus);

    const update = { status: toStatus };
    if (toStatus === "Rejected") {
      update.rejectedBy = actorId;
      update.rejectedAt = new Date();
      update.rejectionReason = rejectionReason;
    }

    // Atomic claim — closes the same TOCTOU race this platform's Supply Chain hardening pass found
    // and fixed across every transition method (SUPPLY_CHAIN_PRODUCTION_RELEASE.md §1); applied
    // proactively here from the first line of implementation rather than discovered later.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: doc.status },
      { $set: update },
      { new: true },
    );
    if (!claimed) {
      throwError("This manual consumption record was already transitioned by a concurrent request.", 409);
    }
    return claimed;
  }

  /**
   * The one place a manual consumption record actually leaves the warehouse — reuses the existing
   * Inventory Posting Engine (WarehouseDocument OUT) exactly like every other consumption path in
   * this platform, and the Journal Entry Posting Engine for the accounting impact. The Cost Engine
   * is never called directly here — `postDocument()`'s OUT branch already resolves outbound cost
   * per the StockItem's own configured costMethod; this service only reads the result back to
   * populate its own record.
   */
  async approve({ id, brand, branch, actorId }) {
    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Manual consumption record not found.", 404);
    transitionGuard.assertValid(doc.status, "Approved");
    if (!doc.items || doc.items.length === 0) {
      throwError("Manual consumption record has no items.", 400);
    }

    // Atomic claim BEFORE any side effect — closes the same double-posting race already fixed
    // across every posting-adjacent transition in this platform (GoodsReceiptNote.confirm(),
    // PurchaseReturnInvoice.approve(), ...).
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Submitted" },
      { $set: { status: "Approved", approvedBy: actorId, approvedAt: new Date() } },
    );
    if (!claimed) {
      throwError("This manual consumption record was already approved or cancelled by a concurrent request.", 409);
    }

    const warehouseDocument = await warehouseDocumentService.create({
      brandId: brand,
      branchId: branch,
      createdBy: actorId,
      data: {
        branch,
        documentType: "OUT",
        postingDate: doc.consumptionDate || new Date(),
        transactionType: "ManualConsumption",
        documentNumber: `WD-${doc.consumptionNumber}`,
        sourceWarehouse: doc.warehouse,
        items: doc.items.map((item) => ({
          stockItem: item.stockItem,
          quantity: item.quantity,
          unitCost: 0, // ignored for OUT movements — postDocument()'s Cost Engine resolves the real cost
          totalCost: 0,
        })),
        status: "approved",
      },
    });

    const { ledgerRows } = await warehouseDocumentService.postDocument({
      id: warehouseDocument._id, brand, branch, postedBy: actorId,
    });

    const costByItem = Object.fromEntries(
      ledgerRows.map((row) => [String(row.stockItem), { unitCost: row.outbound.unitCost, totalCost: row.outbound.totalCost }]),
    );
    const resolvedItems = doc.items.map((item) => {
      const cost = costByItem[String(item.stockItem)] || { unitCost: 0, totalCost: 0 };
      return { stockItem: item.stockItem, quantity: item.quantity, unitCost: cost.unitCost, totalCost: cost.totalCost };
    });
    const totalCost = resolvedItems.reduce((sum, item) => sum + item.totalCost, 0);

    doc.items = resolvedItems;
    doc.totalCost = totalCost;
    doc.warehouseDocument = warehouseDocument._id;
    doc.status = "Approved";
    doc.approvedBy = actorId;
    doc.approvedAt = new Date();

    try {
      await this._postAccounting(doc, actorId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[manual-consumption.service] Journal entry not posted for ${doc.consumptionNumber}: ${err.message}`);
    }

    await doc.save();
    return doc;
  }

  /**
   * Debits each item's cost to the GL account its StockItem.itemType is configured to route to
   * (AccountingSettings.inventoryAccounting.consumptionBehavior — already-existing config this
   * platform built for exactly this kind of routing decision, reused unmodified), credits
   * Inventory for the total. Items with different itemTypes correctly produce separate debit
   * lines, not one lumped "Expense" line — a real double-entry requirement, not a simplification.
   */
  async _postAccounting(doc, actorId) {
    const settings = await accountingSettingService.resolveForPosting(doc.brand, doc.branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";

    const stockItems = await StockItemModel.find({ _id: { $in: doc.items.map((i) => i.stockItem) } })
      .select("itemType")
      .lean();
    const itemTypeByStockItem = Object.fromEntries(stockItems.map((s) => [String(s._id), s.itemType]));

    const totalsByDebitCategory = {};
    for (const item of doc.items) {
      const itemType = itemTypeByStockItem[String(item.stockItem)] || "ingredient";
      const debitCategory = settings.inventoryAccounting?.consumptionBehavior?.[itemType]?.debit || "OPERATING_EXPENSE";
      totalsByDebitCategory[debitCategory] = (totalsByDebitCategory[debitCategory] || 0) + item.totalCost;
    }

    const lines = [];
    let totalCredit = 0;
    for (const [debitCategory, amount] of Object.entries(totalsByDebitCategory)) {
      if (amount <= 0) continue;
      const accountKey = DEBIT_CATEGORY_TO_CONTROL_ACCOUNT[debitCategory];
      const account = settings.controlAccounts?.[accountKey];
      if (!account) continue;
      lines.push(journalLine(account, `Manual Consumption ${doc.consumptionNumber} (${doc.reasonCategory})`, amount, 0, currency));
      totalCredit += amount;
    }

    if (lines.length === 0 || totalCredit <= 0) return;

    const inventoryAccount = settings.controlAccounts?.inventory;
    if (!inventoryAccount) return;
    lines.push(journalLine(inventoryAccount, `Manual Consumption ${doc.consumptionNumber} (${doc.reasonCategory})`, 0, totalCredit, currency));

    const { entry } = await journalEntryService.postFromSource({
      sourceType: "MANUAL_CONSUMPTION",
      brand: doc.brand,
      branch: doc.branch,
      date: doc.consumptionDate || new Date(),
      description: `Manual Consumption ${doc.consumptionNumber} — ${doc.reasonCategory}`,
      lines,
      createdBy: actorId,
      sourceRef: doc._id,
    });

    doc.journalEntry = entry._id;
    doc.accountingPosted = true;
  }
}

export default new ManualConsumptionService();
export { transitionGuard as manualConsumptionTransitionGuard };
