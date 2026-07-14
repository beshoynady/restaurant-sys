import WasteRecordModel from "./waste-record.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";
import warehouseDocumentService from "../warehouse-document/warehouse-document.service.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

// Same convention as ManualConsumption/GoodsReceiptNote/PurchaseOrder: approving IS posting.
// Once physically written off, there is no undo — Cancelled/Rejected are only reachable before
// that point.
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

class WasteRecordService extends AdvancedService {
  constructor() {
    super(WasteRecordModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: false, // transactional document, status lifecycle instead
      defaultPopulate: [
        "brand", "branch", "warehouse", "department", "shift", "responsibleEmployee",
        "items.stockItem", "approvedBy", "rejectedBy", "warehouseDocument", "journalEntry",
        "createdBy", "updatedBy",
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const settings = await inventorySettingsService.resolveForPosting(data.brand, data.branch);
    if (!settings._id) {
      throwError("No InventorySettings configured for this brand/branch — cannot generate a waste record number.", 422);
    }

    const wasteNumber = await sequenceGenerator.getNext({
      Model: inventorySettingsService.model,
      filter: { _id: settings._id },
      sequenceField: "wasteRecordSequence",
    });

    return { ...data, wasteNumber, status: "Draft" };
  }

  async transition({ id, brand, branch, toStatus, actorId, rejectionReason = null }) {
    if (toStatus === "Approved") return this.approve({ id, brand, branch, actorId });

    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Waste record not found.", 404);
    transitionGuard.assertValid(doc.status, toStatus);

    const update = { status: toStatus };
    if (toStatus === "Rejected") {
      update.rejectedBy = actorId;
      update.rejectedAt = new Date();
      update.rejectionReason = rejectionReason;
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: doc.status },
      { $set: update },
      { new: true },
    );
    if (!claimed) {
      throwError("This waste record was already transitioned by a concurrent request.", 409);
    }
    return claimed;
  }

  /**
   * The one place a waste record actually leaves the warehouse — reuses the existing Inventory
   * Posting Engine (WarehouseDocument OUT, transactionType "Wastage") exactly like every other
   * loss-recording path in this platform, and the Journal Entry Posting Engine for the accounting
   * impact. Routes to `controlAccounts.inventoryAdjustment` — the same account
   * InventoryCount.execute()'s shrinkage posting already uses for an unplanned inventory loss;
   * `wasteCategory` gives reporting-level granularity on the record itself rather than requiring a
   * dedicated GL account per waste reason (spoilage vs. theft vs. burned food all reduce the same
   * inventory-adjustment expense line — the *reason* is operational/audit detail, not a distinct
   * accounting treatment).
   */
  async approve({ id, brand, branch, actorId }) {
    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Waste record not found.", 404);
    transitionGuard.assertValid(doc.status, "Approved");
    if (!doc.items || doc.items.length === 0) {
      throwError("Waste record has no items.", 400);
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Submitted" },
      { $set: { status: "Approved", approvedBy: actorId, approvedAt: new Date() } },
    );
    if (!claimed) {
      throwError("This waste record was already approved or cancelled by a concurrent request.", 409);
    }

    const warehouseDocument = await warehouseDocumentService.create({
      brandId: brand,
      branchId: branch,
      createdBy: actorId,
      data: {
        branch,
        documentType: "OUT",
        postingDate: doc.wasteDate || new Date(),
        transactionType: "Wastage",
        documentNumber: `WD-${doc.wasteNumber}`,
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
      console.error(`[waste-record.service] Journal entry not posted for ${doc.wasteNumber}: ${err.message}`);
    }

    await doc.save();
    return doc;
  }

  async _postAccounting(doc, actorId) {
    if (doc.totalCost <= 0) return;

    const settings = await accountingSettingService.resolveForPosting(doc.brand, doc.branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const inventoryAdjustmentAccount = settings.controlAccounts?.inventoryAdjustment;
    const inventoryAccount = settings.controlAccounts?.inventory;
    if (!inventoryAdjustmentAccount || !inventoryAccount) return;

    const description = `Waste ${doc.wasteNumber} (${doc.wasteCategory})`;
    const lines = [
      journalLine(inventoryAdjustmentAccount, description, doc.totalCost, 0, currency),
      journalLine(inventoryAccount, description, 0, doc.totalCost, currency),
    ];

    const { entry } = await journalEntryService.postFromSource({
      sourceType: "WASTE",
      brand: doc.brand,
      branch: doc.branch,
      date: doc.wasteDate || new Date(),
      description,
      lines,
      createdBy: actorId,
      sourceRef: doc._id,
    });

    doc.journalEntry = entry._id;
    doc.accountingPosted = true;
  }
}

export default new WasteRecordService();
export { transitionGuard as wasteRecordTransitionGuard };
