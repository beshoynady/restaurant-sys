const express = require('express');
const router = express.Router();
const expensesController = require('../../controllers/expense.controller');
const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')


router.route("/")
    .post(authenticateToken,expensesController.createExpense)
    .get(authenticateToken,expensesController.getAllExpenses);
router.route("/:expenseId")
    .get(authenticateToken,expensesController.getExpenseById)
    .put(authenticateToken,expensesController.updateExpense)
    .delete(authenticateToken,expensesController.deleteExpense);



module.exports = router;
