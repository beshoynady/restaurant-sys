import express from "express";
import accountingPeriodController from "../../controllers/accounting/accounting-period.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAccountingPeriodSchema, 
  updateAccountingPeriodSchema, 
  paramsAccountingPeriodSchema, 
  paramsAccountingPeriodIdsSchema,
  queryAccountingPeriodSchema 
} from "../../validation/accounting/accounting-period.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountingPeriodSchema), accountingPeriodController.create)
  .get(authenticateToken, validate(queryAccountingPeriodSchema), accountingPeriodController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAccountingPeriodSchema), accountingPeriodController.getOne)
  .put(authenticateToken, validate(updateAccountingPeriodSchema), accountingPeriodController.update)
  .delete(authenticateToken, validate(paramsAccountingPeriodSchema), accountingPeriodController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAccountingPeriodSchema), accountingPeriodController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAccountingPeriodSchema), accountingPeriodController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAccountingPeriodIdsSchema), accountingPeriodController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAccountingPeriodIdsSchema), accountingPeriodController.bulkSoftDelete);


export default router;
