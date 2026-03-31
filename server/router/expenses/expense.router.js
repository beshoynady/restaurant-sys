import express from "express";
import expenseController from "../../controllers/expenses/expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createExpenseSchema, updateExpenseSchema } from "../../validation/expenses/expense.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createExpenseSchema), expenseController.create)
  .get(authenticateToken, expenseController.getAll)
;

router.route("/:id")
  .get(authenticateToken, expenseController.getOne)
  .put(authenticateToken, validate(updateExpenseSchema), expenseController.update)
  .delete(authenticateToken, expenseController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, expenseController.restore)
;



export default router;
