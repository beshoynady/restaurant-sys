import express from "express";
import accountingPeriodController from "../../controllers/accounting/accounting-period.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAccountingPeriodSchema, updateAccountingPeriodSchema, accountingPeriodParamsSchema, accountingPeriodQuerySchema } from "../../validation/accounting/accounting-period.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountingPeriodSchema), accountingPeriodController.create)
  .get(authenticateToken, validate(accountingPeriodQuerySchema), accountingPeriodController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(accountingPeriodParamsSchema), accountingPeriodController.getOne)
  .put(authenticateToken, validate(updateAccountingPeriodSchema), accountingPeriodController.update)
  .delete(authenticateToken, validate(accountingPeriodParamsSchema), accountingPeriodController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(accountingPeriodParamsSchema), accountingPeriodController.restore)
;

export default router;
