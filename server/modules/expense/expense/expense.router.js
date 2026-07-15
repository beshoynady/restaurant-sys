import express from "express";
import expenseController from "./expense.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createExpenseSchema,
  updateExpenseSchema,
  paramsExpenseSchema,
  paramsExpenseIdsSchema,
  queryExpenseSchema,
} from "./expense.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("Expenses", "create"), checkModuleEnabled("financial"), validate(createExpenseSchema), expenseController.create)
  .get(authenticateToken, authorize("Expenses", "read"), checkModuleEnabled("financial"), validate(queryExpenseSchema), expenseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("Expenses", "read"), checkModuleEnabled("financial"), validate(paramsExpenseSchema, "params"), expenseController.getOne)
  .put(authenticateToken, authorize("Expenses", "update"), checkModuleEnabled("financial"), validate(updateExpenseSchema), expenseController.update)
  .delete(authenticateToken, authorize("Expenses", "delete"), checkModuleEnabled("financial"), validate(paramsExpenseSchema, "params"), expenseController.hardDelete)
;

// --- BULK HARD DELETE ---
router.route("/bulk-delete")
  .delete(authenticateToken, authorize("Expenses", "delete"), checkModuleEnabled("financial"), validate(paramsExpenseIdsSchema), expenseController.bulkHardDelete);

export default router;
