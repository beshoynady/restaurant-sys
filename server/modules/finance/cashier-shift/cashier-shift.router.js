import express from "express";
import cashierShiftController from "./cashier-shift.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createCashierShiftSchema, 
  updateCashierShiftSchema, 
  paramsCashierShiftSchema, 
  paramsCashierShiftIdsSchema,
  queryCashierShiftSchema 
} from "./cashier-shift.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("CashierShifts", "create"),
    checkModuleEnabled("financial"), validate(createCashierShiftSchema), cashierShiftController.create)
  .get(authenticateToken,
    authorize("CashierShifts", "read"),
    checkModuleEnabled("financial"), validate(queryCashierShiftSchema), cashierShiftController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("CashierShifts", "read"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftSchema, "params"), cashierShiftController.getOne)
  .put(authenticateToken,
    authorize("CashierShifts", "update"),
    checkModuleEnabled("financial"), validate(updateCashierShiftSchema), cashierShiftController.update)
  .delete(authenticateToken,
    authorize("CashierShifts", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftSchema, "params"), cashierShiftController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-02, corrected: soft-delete/restore/
// bulk-soft-delete removed — CashierShift is a transactional document
// (OPEN/COUNTED/CLOSED/POSTED/CANCELLED lifecycle), not master data.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("CashierShifts", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftIdsSchema), cashierShiftController.bulkHardDelete);


export default router;
