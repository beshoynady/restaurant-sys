// DATABASE_IMPLEMENTATION_PLAN.md DB-007: atomic, branch-scoped order-number generation.
// Converted from TypeScript to plain JavaScript at the user's explicit request — the class-level
// generic typing (`BaseRepository<IOrderSettings>`) and per-method return-type annotations are
// dropped; behavior is unchanged.
import BaseRepository from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import OrderSettingsModel from "./order-settings.model.js";

class OrderSettingsService extends BaseRepository {
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
  async getNextOrderNumber(brandId, branchId) {
    const settings = await this.model
      .findOne({ brand: brandId, branch: branchId, isDeleted: false })
      .lean();

    if (!settings) {
      throwError(
        "No OrderSettings configured for this branch — cannot generate an order number.",
        422,
      );
    }

    const prefix = settings.orderSequence?.prefix || "ORD-";

    if (settings.orderSequence?.resetDaily) {
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

    const assignedNumber = incremented.orderSequence?.currentNumber ?? 1;
    return `${prefix}${assignedNumber}`;
  }

  /**
   * Enterprise Order Management Platform: read-side primitive for callers that need the
   * configured behavior toggles (`cancelReasonRequired`, `requireManagerApprovalForCancel`,
   * `allowEditOrderAfterSendToKitchen`, ...) rather than the order-number sequence. These fields
   * were confirmed, by direct read, to be real schema fields with zero code anywhere reading
   * them — the same "designed but dead" pattern this engagement has repeatedly found and closed
   * elsewhere in this domain. Returns `null` (not a fabricated default object) when no
   * OrderSettings document exists for this branch — a branch that can create orders at all
   * already has one (`getNextOrderNumber` above requires it), so `null` here means "settings
   * genuinely not provisioned yet," and callers decide their own safe fallback.
   */
  async resolveForBranch(brandId, branchId) {
    return this.model.findOne({ brand: brandId, branch: branchId, isDeleted: false }).lean();
  }
}

export default new OrderSettingsService();
