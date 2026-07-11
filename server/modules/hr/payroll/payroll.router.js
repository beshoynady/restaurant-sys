import express from "express";
import payrollController from "./payroll.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPayrollSchema, 
  updatePayrollSchema, 
  paramsPayrollSchema, 
  paramsPayrollIdsSchema,
  queryPayrollSchema 
} from "./payroll.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Payrolls", "create"),
    checkModuleEnabled("hr"), validate(createPayrollSchema), payrollController.create)
  .get(authenticateToken,
    authorize("Payrolls", "read"),
    checkModuleEnabled("hr"), validate(queryPayrollSchema), payrollController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Payrolls", "read"),
    checkModuleEnabled("hr"), validate(paramsPayrollSchema), payrollController.getOne)
  .put(authenticateToken,
    authorize("Payrolls", "update"),
    checkModuleEnabled("hr"), validate(updatePayrollSchema), payrollController.update)
  .delete(authenticateToken,
    authorize("Payrolls", "delete"),
    checkModuleEnabled("hr"), validate(paramsPayrollSchema), payrollController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Payrolls", "delete"),
    checkModuleEnabled("hr"), validate(paramsPayrollSchema), payrollController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Payrolls", "update"),
    checkModuleEnabled("hr"), validate(paramsPayrollSchema), payrollController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Payrolls", "delete"),
    checkModuleEnabled("hr"), validate(paramsPayrollIdsSchema), payrollController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Payrolls", "delete"),
    checkModuleEnabled("hr"),validate(paramsPayrollIdsSchema), payrollController.bulkSoftDelete);


export default router;
