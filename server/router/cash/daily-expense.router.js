const express = require("express");
const router = express.Router();
const dailyExpensesController = require("../../controllers/daily-expense.controller");
const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

// Get all daily expenses
router
  .route("/")
  .post(
    authenticateToken,
    checkSubscription,
    dailyExpensesController.addDailyExpense
  )
  .get(
    authenticateToken,
    checkSubscription,
    dailyExpensesController.getAllDailyExpenses
  );

// Get one daily expense by ID
router
  .route("/:dailyexpenseId")
  .get(
    authenticateToken,
    checkSubscription,
    dailyExpensesController.getDailyExpenseById
  )
  .put(
    authenticateToken,
    checkSubscription,
    dailyExpensesController.updateDailyExpense
  )
  .delete(
    authenticateToken,
    checkSubscription,
    dailyExpensesController.deleteDailyExpense
  );

module.exports = router;
