import InventoryCountModel from "./inventory-count.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";
import InventoryModel from "../inventory/inventory.model.js";
import warehouseDocumentService from "../warehouse-document/warehouse-document.service.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

// SUPPLY_CHAIN_COMMERCE_PLATFORM_AUDIT.md — InventoryCount's own header comment already described
// this exact workflow ("Execution will generate: WarehouseDocument (Adjustment In/Out)") but no
// code implemented it; this is that implementation. Once Approved, the count's own numbers are
// locked in — Cancelled is only reachable before that.
const transitionGuard = createTransitionGuard({
  Draft: ["InProgress", "Canceled"],
  InProgress: ["Submitted", "Canceled"],
  Submitted: ["Approved", "Canceled"],
  Approved: ["Executed"],
  Executed: [],
  Canceled: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

class InventoryCountService extends AdvancedService {
  constructor() {
    super(InventoryCountModel, {
      brandScoped: true,
      // Was `softDelete: true` — not a recognized BaseRepository option (the real one is
      // `enableSoftDelete`), silently ignored. Corrected to `enableSoftDelete: false`, matching
      // this platform's established convention for transactional documents with their own status
      // lifecycle (Draft/.../Executed/Canceled already exists) — a mistaken count is cancelled via
      // status, not soft-deleted, same reasoning as PurchaseInvoice/PurchaseOrder/GoodsReceiptNote.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "warehouse", "createdBy", "approvedBy", "executedBy", "adjustmentDocument"],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const settings = await inventorySettingsService.resolveForPosting(data.brand, data.branch);
    if (!settings._id) {
      throwError("No InventorySettings configured for this brand/branch — cannot generate a count number.", 422);
    }

    const countNumber = await sequenceGenerator.getNext({
      Model: inventorySettingsService.model,
      filter: { _id: settings._id },
      sequenceField: "countSequence",
    });

    // System quantity is captured fresh at creation as a starting reference; re-captured again
    // when counting actually starts (`start()`) so it reflects stock at the moment counting
    // begins, not whenever the draft happened to be created.
    const items = await this._withSystemQuantities(data.brand, data.warehouse, data.items || []);

    return { ...data, countNumber, items, status: "Draft" };
  }

  async _withSystemQuantities(brand, warehouse, items) {
    const balances = await InventoryModel.find({ brand, warehouse, stockItem: { $in: items.map((i) => i.stockItem) } })
      .select("stockItem quantity avgUnitCost")
      .lean();
    const balanceByItem = Object.fromEntries(balances.map((b) => [String(b.stockItem), b]));

    return items.map((item) => {
      const balance = balanceByItem[String(item.stockItem)];
      const systemQuantity = balance?.quantity ?? 0;
      const countedQuantity = item.countedQuantity ?? systemQuantity;
      return { ...item, systemQuantity, countedQuantity, variance: countedQuantity - systemQuantity };
    });
  }

  /** Draft -> InProgress: re-snapshots systemQuantity/variance against current stock, since time
   * may have passed (and other movements happened) between drafting and actually starting the count. */
  async start({ id, brand, branch }) {
    const count = await this.model.findOne({ _id: id, brand, branch });
    if (!count) throwError("Inventory count not found.", 404);
    transitionGuard.assertValid(count.status, "InProgress");

    const items = await this._withSystemQuantities(brand, count.warehouse, count.items.map((i) => i.toObject()));

    // V6.0 Production Hardening: atomic claim (status filter), not read-then-save — closes the
    // TOCTOU race two concurrent start() calls would otherwise hit.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: count.status },
      { $set: { items, status: "InProgress" } },
      { new: true },
    );
    if (!claimed) throwError("This inventory count was already transitioned by a concurrent request.", 409);
    return claimed;
  }

  async transition({ id, brand, branch, toStatus, actorId }) {
    if (toStatus === "InProgress") return this.start({ id, brand, branch });
    if (toStatus === "Executed") return this.execute({ id, brand, branch, actorId });

    const count = await this.model.findOne({ _id: id, brand, branch });
    if (!count) throwError("Inventory count not found.", 404);
    transitionGuard.assertValid(count.status, toStatus);

    const update = { status: toStatus };
    if (toStatus === "Approved") {
      update.approvedBy = actorId;
      update.approvedAt = new Date();
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: count.status },
      { $set: update },
      { new: true },
    );
    if (!claimed) throwError("This inventory count was already transitioned by a concurrent request.", 409);
    return claimed;
  }

  /**
   * The one place a count actually corrects inventory — reuses the Inventory Posting Engine
   * (WarehouseDocument ADJUSTMENT), never reimplements it. Only items with a non-zero variance
   * produce a movement line; a perfectly-matching count produces an empty adjustment (no
   * WarehouseDocument at all — nothing to post).
   */
  async execute({ id, brand, branch, actorId }) {
    const count = await this.model.findOne({ _id: id, brand, branch });
    if (!count) throwError("Inventory count not found.", 404);
    transitionGuard.assertValid(count.status, "Executed");

    // V6.0 Production Hardening: atomic claim BEFORE any side effect — same pattern as
    // GoodsReceiptNote.confirm()/PurchaseReturnInvoice.approve(). Without this, two concurrent
    // execute() calls for the same count could both pass assertValid() above and each post their
    // own ADJUSTMENT WarehouseDocument for the same variance — a double inventory correction.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: count.status },
      { $set: { status: "Executed", executedBy: actorId, executedAt: new Date() } },
    );
    if (!claimed) {
      throwError("This inventory count was already executed or cancelled by a concurrent request.", 409);
    }

    const varianceItems = count.items.filter((item) => item.variance !== 0);

    if (varianceItems.length > 0) {
      const balances = await InventoryModel.find({ brand, warehouse: count.warehouse, stockItem: { $in: varianceItems.map((i) => i.stockItem) } })
        .select("stockItem avgUnitCost")
        .lean();
      const costByItem = Object.fromEntries(balances.map((b) => [String(b.stockItem), b.avgUnitCost || 0]));

      const warehouseDocument = await warehouseDocumentService.create({
        brandId: brand,
        branchId: branch,
        createdBy: actorId,
        data: {
          branch,
          documentType: "ADJUSTMENT",
          postingDate: new Date(),
          transactionType: "InventoryCount",
          documentNumber: `WD-${count.countNumber}`,
          sourceWarehouse: count.warehouse,
          items: varianceItems.map((item) => {
            const unitCost = costByItem[String(item.stockItem)] || 0;
            return { stockItem: item.stockItem, quantity: item.variance, unitCost, totalCost: Math.abs(item.variance) * unitCost };
          }),
          status: "approved",
        },
      });
      await warehouseDocumentService.postDocument({ id: warehouseDocument._id, brand, branch, postedBy: actorId });
      count.adjustmentDocument = warehouseDocument._id;

      // Journal Entry (if configured) — best-effort, same non-blocking philosophy as every other
      // posting engine in this platform. Net adjustment value: positive variance (found more) is
      // a gain (debit Inventory, credit the adjustment/gain account); negative (shrinkage) is a
      // loss (debit the adjustment/loss account, credit Inventory).
      try {
        const settings = await accountingSettingService.resolveForPosting(brand, branch);
        const netValue = varianceItems.reduce((sum, item) => sum + item.variance * (costByItem[String(item.stockItem)] || 0), 0);
        if (netValue !== 0 && settings.controlAccounts?.inventory && settings.controlAccounts?.inventoryAdjustment) {
          const currency = settings.currencySettings?.baseCurrency || "EGP";
          const absValue = Math.abs(netValue);
          const lines = netValue > 0
            ? [
                journalLine(settings.controlAccounts.inventory, `Inventory Count ${count.countNumber} - overage`, absValue, 0, currency),
                journalLine(settings.controlAccounts.inventoryAdjustment, `Inventory Count ${count.countNumber} - overage`, 0, absValue, currency),
              ]
            : [
                journalLine(settings.controlAccounts.inventoryAdjustment, `Inventory Count ${count.countNumber} - shrinkage`, absValue, 0, currency),
                journalLine(settings.controlAccounts.inventory, `Inventory Count ${count.countNumber} - shrinkage`, 0, absValue, currency),
              ];

          const { entry } = await journalEntryService.postFromSource({
            sourceType: "INVENTORY_COUNT",
            brand, branch,
            date: count.countDate || new Date(),
            description: `Inventory Count ${count.countNumber}`,
            lines,
            createdBy: actorId,
            sourceRef: count._id,
          });
          count.journalEntry = entry._id;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[inventory-count.service] Journal entry not posted for count ${count._id}: ${err.message}`);
      }
    }

    // status/executedBy/executedAt were already atomically claimed above; this persists
    // adjustmentDocument/journalEntry set on the winning caller's own in-memory doc afterward —
    // not a second competing write.
    count.status = "Executed";
    count.executedBy = actorId;
    count.executedAt = new Date();
    await count.save();

    return count;
  }
}

export default new InventoryCountService();
export { transitionGuard as inventoryCountTransitionGuard };
