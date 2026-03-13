import express from "express";
const router = express.Router();
import expensesController from "../../controllers/expense.controller.js";
import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";


router.route("/")
    .post(authenticateToken,expensesController.createExpense)
    .get(authenticateToken,expensesController.getAllExpenses);
router.route("/:expenseId")
    .get(authenticateToken,expensesController.getExpenseById)
    .put(authenticateToken,expensesController.updateExpense)
    .delete(authenticateToken,expensesController.deleteExpense);



export default router;
