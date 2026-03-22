import express from "express";
const router = express.Router();
import {
  createDailyExpense,
  getAllDailyExpenses,
  getDailyExpenseById,
  updateDailyExpense,
  deleteDailyExpense,
} from "../../controllers/expenses/daily-expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";

router.use(authenticateToken);
// Get all daily expenses
router.route("/").post(createDailyExpense).get(getAllDailyExpenses);

// Get one daily expense by ID
router
  .route("/:dailyexpenseId")
  .get(getDailyExpenseById)
  .put(updateDailyExpense)
  .delete(deleteDailyExpense);

export default router;
