import express from "express";
import payrollController from "../../controllers/employees/payroll.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPayrollSchema, 
  updatePayrollSchema, 
  paramsPayrollSchema, 
  paramsPayrollIdsSchema,
  queryPayrollSchema 
} from "../../validation/employees/payroll.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPayrollSchema), payrollController.create)
  .get(authenticateToken, validate(queryPayrollSchema), payrollController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPayrollSchema), payrollController.getOne)
  .put(authenticateToken, validate(updatePayrollSchema), payrollController.update)
  .delete(authenticateToken, validate(paramsPayrollSchema), payrollController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPayrollSchema), payrollController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPayrollSchema), payrollController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPayrollIdsSchema), payrollController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPayrollIdsSchema), payrollController.bulkSoftDelete);


export default router;
