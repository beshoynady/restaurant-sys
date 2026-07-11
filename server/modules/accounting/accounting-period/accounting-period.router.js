import express from "express";
import accountingPeriodController from "./accounting-period.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAccountingPeriodSchema, 
  updateAccountingPeriodSchema, 
  paramsAccountingPeriodSchema, 
  paramsAccountingPeriodIdsSchema,
  queryAccountingPeriodSchema 
} from "./accounting-period.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AccountingPeriods", "create"),
    checkModuleEnabled("accounting"), validate(createAccountingPeriodSchema), accountingPeriodController.create)
  .get(authenticateToken,
    authorize("AccountingPeriods", "read"),
    checkModuleEnabled("accounting"), validate(queryAccountingPeriodSchema), accountingPeriodController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AccountingPeriods", "read"),
    checkModuleEnabled("accounting"), validate(paramsAccountingPeriodSchema), accountingPeriodController.getOne)
  .put(authenticateToken,
    authorize("AccountingPeriods", "update"),
    checkModuleEnabled("accounting"), validate(updateAccountingPeriodSchema), accountingPeriodController.update)
  .delete(authenticateToken,
    authorize("AccountingPeriods", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountingPeriodSchema), accountingPeriodController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AccountingPeriods", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountingPeriodSchema), accountingPeriodController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AccountingPeriods", "update"),
    checkModuleEnabled("accounting"), validate(paramsAccountingPeriodSchema), accountingPeriodController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AccountingPeriods", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountingPeriodIdsSchema), accountingPeriodController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AccountingPeriods", "delete"),
    checkModuleEnabled("accounting"),validate(paramsAccountingPeriodIdsSchema), accountingPeriodController.bulkSoftDelete);


export default router;
