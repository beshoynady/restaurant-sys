// DATABASE_IMPLEMENTATION_PLAN.md DB-007: atomic, branch-scoped order-number generation.
import BaseService from "../../../utils/BaseService.js";
import throwErrorJs from "../../../utils/throwError.js";
import OrderSettingsModel, { type IOrderSettings } from "./order-settings.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

class OrderSettingsService extends BaseService<IOrderSettings> {
  constructor() {
    super(OrderSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * DB-007: atomic, branch-scoped, concurrency-safe order-number generation.
   *
   * Two-step atomic pattern (no read-modify-write race window):
   *  1. Attempt to atomically claim the "first order of a new day" slot via a
   *     conditional `findOneAndUpdate` whose filter only matches when a reset
   *     is actually due. Under concurrency, at most one caller's filter can
   *     match — the first to commit changes `lastResetDate` to today, so every
   *     other concurrent caller's identical filter stops matching immediately.
   *  2. Otherwise, atomically `$inc` the counter and read the PRE-increment
   *     value (`{ new: false }`) as this order's number — `$inc` is a single
   *     atomic operation per document in MongoDB, so concurrent callers always
   *     receive distinct, sequential values with no possible collision.
   *
   * Throws if no OrderSettings document exists for this specific branch —
   * deliberately does not fabricate one with guessed defaults (a required
   * `createdBy` audit field couldn't be filled in meaningfully here); a
   * branch must be provisioned with OrderSettings before it can transact.
   */
  async getNextOrderNumber(brandId: string, branchId: string): Promise<string> {
    const settings = await this.model
      .findOne({ brand: brandId, branch: branchId, isDeleted: false })
      .lean();

    if (!settings) {
      throwError(
        "No OrderSettings configured for this branch — cannot generate an order number.",
        422,
      );
    }

    // Non-null: throwError() above throws synchronously and never returns, but the imported
    // `.js` `never`-return type isn't consistently narrowed by TS's control-flow analysis across
    // this call boundary — asserted here rather than relying on that narrowing.
    const prefix = settings!.orderSequence?.prefix || "ORD-";

    if (settings!.orderSequence?.resetDaily) {
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const resetResult = await this.model.findOneAndUpdate(
        {
          brand: brandId,
          branch: branchId,
          $or: [
            { "orderSequence.lastResetDate": null },
            { "orderSequence.lastResetDate": { $exists: false } },
            { "orderSequence.lastResetDate": { $lt: todayUTC } },
          ],
        },
        { $set: { "orderSequence.currentNumber": 2, "orderSequence.lastResetDate": todayUTC } },
        { new: false },
      );

      if (resetResult) {
        return `${prefix}1`;
      }
    }

    const incremented = await this.model.findOneAndUpdate(
      { brand: brandId, branch: branchId },
      { $inc: { "orderSequence.currentNumber": 1 } },
      { new: false }, // return the document as it was BEFORE this increment
    );

    if (!incremented) {
      throwError(
        "No OrderSettings configured for this branch — cannot generate an order number.",
        422,
      );
    }

    const assignedNumber = incremented!.orderSequence?.currentNumber ?? 1;
    return `${prefix}${assignedNumber}`;
  }
}

export default new OrderSettingsService();
