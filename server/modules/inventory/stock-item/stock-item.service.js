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
}

export default new StockItemService();
