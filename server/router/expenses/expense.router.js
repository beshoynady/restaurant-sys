import express from "express";
import expenseController from "../../controllers/expenses/expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createExpenseSchema, 
  updateExpenseSchema, 
  paramsExpenseSchema, 
  paramsExpenseIdsSchema,
  queryExpenseSchema 
} from "../../validation/expenses/expense.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createExpenseSchema), expenseController.create)
  .get(authenticateToken, validate(queryExpenseSchema), expenseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsExpenseSchema), expenseController.getOne)
  .put(authenticateToken, validate(updateExpenseSchema), expenseController.update)
  .delete(authenticateToken, validate(paramsExpenseSchema), expenseController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsExpenseSchema), expenseController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsExpenseSchema), expenseController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsExpenseIdsSchema), expenseController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsExpenseIdsSchema), expenseController.bulkSoftDelete);


export default router;
