// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) cashier-shift-settings.repository.js.
import CashierShiftSettingsRepository from "./cashier-shift-settings.repository.js";
import throwError from "../../../utils/throwError.js";

class CashierShiftSettingsService extends CashierShiftSettingsRepository {
  /**
   * Atomic, branch-scoped shift-number generation — the exact same technique as
   * order-settings.service.js#getNextOrderNumber (a single `$inc`, returning the PRE-increment
   * value via `{new: false}`, so concurrent callers can never receive the same number). No
   * daily-reset step: unlike an order number, a shift number has no established convention of
   * resetting per day in this codebase, and CashierShiftSettings names no such policy — a shift's
   * `num` is a plain, brand+branch-scoped running counter.
   */
  async getNextShiftNumber(brandId, branchId) {
    const incremented = await this.model.findOneAndUpdate(
      { brand: brandId, branch: branchId },
      { $inc: { "shiftSequence.currentNumber": 1 } },
      { new: false },
    );

    if (!incremented) {
      throwError(
        "No CashierShiftSettings configured for this branch — cannot generate a shift number.",
        422,
      );
    }

    return (incremented.shiftSequence?.currentNumber ?? 0) + 1;
  }
}

export default new CashierShiftSettingsService();
