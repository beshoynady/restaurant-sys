import express from "express";
const router = express.Router();
import dailyExpensesController from "../../controllers/cash/daily-expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";


// Get all daily expenses
router
  .route("/")
  .post(
    authenticateToken,
   
    dailyExpensesController.addDailyExpense
  )
  .get(
    authenticateToken,
   
    dailyExpensesController.getAllDailyExpenses
  );

// Get one daily expense by ID
router
  .route("/:dailyexpenseId")
  .get(
    authenticateToken,
   
    dailyExpensesController.getDailyExpenseById
  )
  .put(
    authenticateToken,
   
    dailyExpensesController.updateDailyExpense
  )
  .delete(
    authenticateToken,
   
    dailyExpensesController.deleteDailyExpense
  );

export default router;
