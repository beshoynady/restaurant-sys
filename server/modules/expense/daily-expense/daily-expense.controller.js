import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import dailyExpenseService from "./daily-expense.service.js";

class DailyExpenseController extends BaseController {
  constructor() {
    super(dailyExpenseService);
  }

  postExpense = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const expense = await dailyExpenseService.postExpense({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
    });
    res.json({ success: true, data: expense });
  });
}

export default new DailyExpenseController();
