import InventoryModel from "./inventory.model.js";
import BaseRepository from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

class InventoryService extends BaseRepository {
  constructor() {
    super(InventoryModel, {
      brandScoped: true,
      // V4.0 Inventory Stock Movement Engine, corrected: the previous implementation was a
      // hand-rolled class (create/findAll/findById/update/delete) that did not extend
      // BaseRepository and did not match BaseController's calling convention
      // (service.create({brandId,branchId,data,createdBy}), service.getAll({...}) — this one had
      // no `getAll` method at all). Despite being fully mounted at /inventory with correct RBAC,
      // every method on that endpoint threw a TypeError — a live, broken, production endpoint.
      // Fixed by rebuilding on the standard Repository Pattern.
      //
      // Inventory is a derived, system-computed balance cache (recomputed from StockLedger by the
      // posting engine below) — not user-managed master data, so soft-delete does not apply; see
      // account-balance.service.js for the identical rationale.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "warehouse", "stockItem"],
      searchableFields: [],
      defaultSort: { updatedAt: -1 },
    });
  }

  /** Recomputes/persists avgUnitCost (derived: totalCost/quantity, not itself additive) after an $inc write. */
  async _syncAvgUnitCost(doc, session) {
    const avgUnitCost = doc.quantity > 0 ? doc.totalCost / doc.quantity : 0;
    if (doc.avgUnitCost !== avgUnitCost) {
      doc.avgUnitCost = avgUnitCost;
      await doc.save({ session: session ?? undefined });
    }
    return doc;
  }

  /**
   * V4.0 Inventory Stock Movement Engine: inbound leg of a stock movement. Always safe to
   * upsert — an inbound movement never needs a precondition on the existing balance.
   */
  async applyInbound({ brand, branch, warehouse, stockItem, quantity, totalCost, session }) {
    const updated = await this.model.findOneAndUpdate(
      { warehouse, stockItem },
      {
        $setOnInsert: { brand, branch, warehouse, stockItem },
        $inc: { quantity, totalCost },
        $set: { lastMovementAt: new Date() },
      },
      { new: true, upsert: true, session: session ?? undefined },
    );
    return this._syncAvgUnitCost(updated, session);
  }

  /**
   * V4.0 Inventory Stock Movement Engine: outbound leg. When `allowNegative` is false, the
   * `quantity: {$gte: quantity}` filter and the `$inc` decrement happen in ONE atomic
   * `findOneAndUpdate` — not a separate read-then-write — so two concurrent postings against the
   * same (warehouse, stockItem) balance can never both succeed past the point where the combined
   * total would go negative; MongoDB evaluates the filter and applies the update as a single
   * operation, so the second caller's filter simply stops matching once the first has committed.
   * Returns null (not an upserted/negative row) when the filter doesn't match — the caller
   * distinguishes "no balance row at all" from "insufficient quantity" only for the error message,
   * both are the same outcome.
   */
  async applyOutbound({ warehouse, stockItem, quantity, totalCost, allowNegative, session }) {
    const filter = { warehouse, stockItem };
    if (!allowNegative) {
      filter.quantity = { $gte: quantity };
    }

    const updated = await this.model.findOneAndUpdate(
      filter,
      { $inc: { quantity: -quantity, totalCost: -totalCost }, $set: { lastMovementAt: new Date() } },
      { new: true, session: session ?? undefined },
    );

    if (!updated) {
      throwError(
        `Insufficient stock for item ${stockItem} in warehouse ${warehouse}: requested ${quantity}. ` +
          "Enable InventorySettings.allowNegativeStock to permit this.",
        409,
      );
    }

    return this._syncAvgUnitCost(updated, session);
  }

  /** Read-only balance lookup used by the posting engine to resolve the current costing basis. */
  async findBalance(warehouse, stockItem, session) {
    return this.model.findOne({ warehouse, stockItem }).session(session ?? null);
  }
}

export default new InventoryService();
