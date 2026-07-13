import StockLedgerModel from "./stock-ledger.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

const INBOUND_SOURCES = new Set([
  "OpeningBalance",
  "Purchase",
  "ReturnIssuance",
  "TransferIn",
  "ProductionIn",
]);

class StockLedgerService extends AdvancedService {
  constructor() {
    super(StockLedgerModel, {
      brandScoped: true,
      // V4.0 Inventory Stock Movement Engine, corrected: StockLedger is an immutable movement
      // log (every row is a permanent record of a stock movement, including its FIFO/LIFO
      // remainingQuantity layer state) — the same class of entity as JournalLine/
      // AssetTransaction elsewhere in this codebase. Soft-delete does not apply.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "warehouse", "stockItem", "documentId", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { movementDate: -1 },
    });
  }

  /** Insert one ledger row within an existing transaction session. */
  async insertMovement(data, session) {
    const [row] = await this.model.create([data], { session });
    return row;
  }

  /**
   * V4.0 Inventory Stock Movement Engine: returns the open FIFO/LIFO layers (inbound rows with
   * remainingQuantity > 0) for a (warehouse, stockItem), oldest-first for FIFO or newest-first for
   * LIFO — the order an outbound movement consumes them in. WeightedAverage-costed items never
   * call this; their outbound cost comes from Inventory.avgUnitCost directly.
   */
  async findOpenLayers(warehouse, stockItem, costMethod, session) {
    const sort = costMethod === "LIFO" ? { movementDate: -1, _id: -1 } : { movementDate: 1, _id: 1 };
    return this.model
      .find({ warehouse, stockItem, remainingQuantity: { $gt: 0 }, source: { $in: [...INBOUND_SOURCES] } })
      .sort(sort)
      .session(session ?? null);
  }

  /** Decrements one layer's remainingQuantity within the caller's transaction session. */
  async consumeLayer(layerId, quantity, session) {
    return this.model.findOneAndUpdate(
      { _id: layerId },
      { $inc: { remainingQuantity: -quantity } },
      { new: true, session: session ?? undefined },
    );
  }
}

export default new StockLedgerService();
