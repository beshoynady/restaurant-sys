const express = require("express");
const router = express.Router();
const dailyExpensesController = require("../../controllers/daily-expense.controller");
const { authenticateToken } = require("../../middlewares/authenticate");


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

module.exports = router;
