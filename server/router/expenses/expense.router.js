import express from "express";
const router = express.Router();
import {
    createExpense,
    updateExpense,
    getAllExpenses,
    getExpenseById,
    deleteExpense
} from "../../controllers/expenses/expense.controller.js";
import {authenticateToken} from "../../middlewares/authenticate.js";

router.use(authenticateToken)

router.route("/")
    .post(createExpense)
    .get(getAllExpenses);
router.route("/:expenseId")
    .get(getExpenseById)
    .put(updateExpense)
    .delete(deleteExpense);



export default router;
