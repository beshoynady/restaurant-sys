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
    checkModuleEnabled("financial"), validate(paramsCashierShiftSchema), cashierShiftController.getOne)
  .put(authenticateToken,
    authorize("CashierShifts", "update"),
    checkModuleEnabled("financial"), validate(updateCashierShiftSchema), cashierShiftController.update)
  .delete(authenticateToken,
    authorize("CashierShifts", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftSchema), cashierShiftController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("CashierShifts", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftSchema), cashierShiftController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("CashierShifts", "update"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftSchema), cashierShiftController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("CashierShifts", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashierShiftIdsSchema), cashierShiftController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("CashierShifts", "delete"),
    checkModuleEnabled("financial"),validate(paramsCashierShiftIdsSchema), cashierShiftController.bulkSoftDelete);


export default router;
