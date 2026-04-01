import express from "express";
import payrollItemController from "../../controllers/employees/payroll-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPayrollItemSchema, updatePayrollItemSchema, payrollItemParamsSchema, payrollItemQuerySchema } from "../../validation/employees/payroll-item.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPayrollItemSchema), payrollItemController.create)
  .get(authenticateToken, validate(payrollItemQuerySchema), payrollItemController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(payrollItemParamsSchema), payrollItemController.getOne)
  .put(authenticateToken, validate(updatePayrollItemSchema), payrollItemController.update)
  .delete(authenticateToken, validate(payrollItemParamsSchema), payrollItemController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(payrollItemParamsSchema), payrollItemController.restore)
;

export default router;
