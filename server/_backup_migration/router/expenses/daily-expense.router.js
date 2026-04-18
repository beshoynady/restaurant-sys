import express from "express";
import dailyExpenseController from "../../controllers/expenses/daily-expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDailyExpenseSchema, 
  updateDailyExpenseSchema, 
  paramsDailyExpenseSchema, 
  paramsDailyExpenseIdsSchema,
  queryDailyExpenseSchema 
} from "../../validation/expenses/daily-expense.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDailyExpenseSchema), dailyExpenseController.create)
  .get(authenticateToken, validate(queryDailyExpenseSchema), dailyExpenseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsDailyExpenseSchema), dailyExpenseController.getOne)
  .put(authenticateToken, validate(updateDailyExpenseSchema), dailyExpenseController.update)
  .delete(authenticateToken, validate(paramsDailyExpenseSchema), dailyExpenseController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsDailyExpenseSchema), dailyExpenseController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsDailyExpenseSchema), dailyExpenseController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsDailyExpenseIdsSchema), dailyExpenseController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsDailyExpenseIdsSchema), dailyExpenseController.bulkSoftDelete);


export default router;
