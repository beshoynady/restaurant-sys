import StockItemModel from "./stock-item.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

class StockItemService extends AdvancedService {
  constructor() {
    super(StockItemModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand","branch","categoryId","inventoryAccount","expenseAccount","cogsAccount","createdBy","updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * V4.0 Inventory Stock Movement Engine: session-aware lookup used by
   * warehouseDocumentService.postDocument() to read a stock item's `costMethod` (FIFO/LIFO/
   * WeightedAverage) inside the posting transaction — needs the transaction's consistent
   * snapshot, which the generic `findOne()` doesn't support (no `session` parameter).
   */
  async findByIdSession(id, session) {
    return this.model.findById(id).session(session ?? null);
  }

  /**
   * V5.2 Cost Engine: refreshes the `lastPurchaseCost` cache after an inbound movement.
   * Cache only — the authoritative source of "what was the last purchase cost" is always the
   * most recent inbound row on StockLedger; this field exists purely so the LastPurchaseCost
   * costing strategy (and any UI) can read it in O(1) instead of querying the ledger.
   */
  async updateLastPurchaseCost(id, unitCost, session) {
    return this.model.findByIdAndUpdate(id, { $set: { lastPurchaseCost: unitCost } }, { session: session ?? null });
  }
}

export default new StockItemService();
