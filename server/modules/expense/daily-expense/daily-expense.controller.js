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

  submitForApproval = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const expense = await dailyExpenseService.submitForApproval({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
    });
    res.json({ success: true, data: expense });
  });

  approveExpense = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const expense = await dailyExpenseService.approveExpense({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId,
    });
    res.json({ success: true, data: expense });
  });

  rejectExpense = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const expense = await dailyExpenseService.rejectExpense({
      id: req.params.id, brand: brandId, branch: branchId, actorId: userId, reason: req.body.reason,
    });
    res.json({ success: true, data: expense });
  });
}

export default new DailyExpenseController();
