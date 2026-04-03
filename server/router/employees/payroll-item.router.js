import express from "express";
import payrollItemController from "../../controllers/employees/payroll-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPayrollItemSchema, 
  updatePayrollItemSchema, 
  paramsPayrollItemSchema, 
  paramsPayrollItemIdsSchema,
  queryPayrollItemSchema 
} from "../../validation/employees/payroll-item.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPayrollItemSchema), payrollItemController.create)
  .get(authenticateToken, validate(queryPayrollItemSchema), payrollItemController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPayrollItemSchema), payrollItemController.getOne)
  .put(authenticateToken, validate(updatePayrollItemSchema), payrollItemController.update)
  .delete(authenticateToken, validate(paramsPayrollItemSchema), payrollItemController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPayrollItemSchema), payrollItemController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPayrollItemSchema), payrollItemController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPayrollItemIdsSchema), payrollItemController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPayrollItemIdsSchema), payrollItemController.bulkSoftDelete);


export default router;
