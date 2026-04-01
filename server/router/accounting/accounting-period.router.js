import express from "express";
import accountingPeriodController from "../../controllers/accounting/accounting-period.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAccountingPeriodSchema, 
  updateAccountingPeriodSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/accounting-period.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountingPeriodSchema), accountingPeriodController.create)
  .get(authenticateToken, validate(querySchema()), accountingPeriodController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), accountingPeriodController.getOne)
  .put(authenticateToken, validate(updateAccountingPeriodSchema), accountingPeriodController.update)
  .delete(authenticateToken, validate(paramsSchema()), accountingPeriodController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), accountingPeriodController.restore)
;

export default router;
