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
  queryCashierShiftSchema,
  countCashierShiftSchema,
  closeCashierShiftSchema,
} from "./cashier-shift.validation.js";

const router = express.Router();

// Close-out engine — count/close/post, in that order. `update`/`approve` permission actions match
// the ones the Order module's own transition endpoints already use for this same reasoning: these
// are business-rule-guarded state transitions, not generic field edits, but they still sit under
// the entity's existing RBAC resource (`CashierShifts`), not a fabricated new one.
router.post("/:id/count",
  authenticateToken, authorize("CashierShifts", "update"), checkModuleEnabled("financial"),
  validate(paramsCashierShiftSchema, "params"), validate(countCashierShiftSchema),
  cashierShiftController.countShift);

router.post("/:id/close",
  authenticateToken, authorize("CashierShifts", "update"), checkModuleEnabled("financial"),
  validate(paramsCashierShiftSchema, "params"), validate(closeCashierShiftSchema),
  cashierShiftController.closeShift);

router.post("/:id/post",
  authenticateToken, authorize("CashierShifts", "update"), checkModuleEnabled("financial"),
  validate(paramsCashierShiftSchema, "params"),
  cashierShiftController.postShift);

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
