import express from "express";
import dailyExpenseController from "./daily-expense.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createDailyExpenseSchema,
  updateDailyExpenseSchema,
  paramsDailyExpenseSchema,
  paramsDailyExpenseIdsSchema,
  queryDailyExpenseSchema,
} from "./daily-expense.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("DailyExpenses", "create"), checkModuleEnabled("financial"), validate(createDailyExpenseSchema), dailyExpenseController.create)
  .get(authenticateToken, authorize("DailyExpenses", "read"), checkModuleEnabled("financial"), validate(queryDailyExpenseSchema), dailyExpenseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("DailyExpenses", "read"), checkModuleEnabled("financial"), validate(paramsDailyExpenseSchema, "params"), dailyExpenseController.getOne)
  .put(authenticateToken, authorize("DailyExpenses", "update"), checkModuleEnabled("financial"), validate(updateDailyExpenseSchema), dailyExpenseController.update)
  .delete(authenticateToken, authorize("DailyExpenses", "delete"), checkModuleEnabled("financial"), validate(paramsDailyExpenseSchema, "params"), dailyExpenseController.hardDelete)
;

// Draft -> Posted: the real posting event (GL + register/bank balance decrement).
router.post("/:id/post",
  authenticateToken, authorize("DailyExpenses", "update"), checkModuleEnabled("financial"),
  validate(paramsDailyExpenseSchema, "params"),
  dailyExpenseController.postExpense);

// --- BULK HARD DELETE ---
router.route("/bulk-delete")
  .delete(authenticateToken, authorize("DailyExpenses", "delete"), checkModuleEnabled("financial"), validate(paramsDailyExpenseIdsSchema), dailyExpenseController.bulkHardDelete);

export default router;
