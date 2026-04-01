import express from "express";
import expenseController from "../../controllers/expenses/expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createExpenseSchema, 
  updateExpenseSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/expenses/expense.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createExpenseSchema), expenseController.create)
  .get(authenticateToken, validate(querySchema()), expenseController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), expenseController.getOne)
  .put(authenticateToken, validate(updateExpenseSchema), expenseController.update)
  .delete(authenticateToken, validate(paramsSchema()), expenseController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), expenseController.restore)
;

export default router;
