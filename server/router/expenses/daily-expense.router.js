import express from "express";
import dailyExpenseController from "../../controllers/expenses/daily-expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDailyExpenseSchema, 
  updateDailyExpenseSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/expenses/daily-expense.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDailyExpenseSchema), dailyExpenseController.create)
  .get(authenticateToken, validate(querySchema()), dailyExpenseController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), dailyExpenseController.getOne)
  .put(authenticateToken, validate(updateDailyExpenseSchema), dailyExpenseController.update)
  .delete(authenticateToken, validate(paramsSchema()), dailyExpenseController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), dailyExpenseController.restore)
;

export default router;
