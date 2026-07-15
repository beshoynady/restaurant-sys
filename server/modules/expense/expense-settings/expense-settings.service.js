// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) expense-settings.repository.js.
import ExpenseSettingsRepository from "./expense-settings.repository.js";
import throwError from "../../../utils/throwError.js";

class ExpenseSettingsService extends ExpenseSettingsRepository {
  /**
   * Atomic, branch-scoped daily-expense-number generation — same `$inc`-with-pre-increment-read
   * technique as order-settings.service.js#getNextOrderNumber / cashier-shift-settings.service.js
   * #getNextShiftNumber. No prefix/reset: DailyExpense.number is a plain Number, matching
   * CashierShift.num's own precedent, not a formatted String like Order.orderNum.
   */
  async getNextExpenseNumber(brandId, branchId) {
    const incremented = await this.model.findOneAndUpdate(
      { brand: brandId, branch: branchId },
      { $inc: { "dailyExpenseSequence.currentNumber": 1 } },
      { new: false },
    );

    if (!incremented) {
      throwError(
        "No ExpenseSettings configured for this branch — cannot generate a daily-expense number.",
        422,
      );
    }

    return (incremented.dailyExpenseSequence?.currentNumber ?? 0) + 1;
  }
}

export default new ExpenseSettingsService();
