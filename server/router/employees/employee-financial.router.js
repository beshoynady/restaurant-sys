import express from "express";
import employeeFinancialController from "../../controllers/employees/employee-financial.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createEmployeeFinancialSchema, updateEmployeeFinancialSchema, employeeFinancialParamsSchema, employeeFinancialQuerySchema } from "../../validation/employees/employee-financial.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeFinancialSchema), employeeFinancialController.create)
  .get(authenticateToken, validate(employeeFinancialQuerySchema), employeeFinancialController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(employeeFinancialParamsSchema), employeeFinancialController.getOne)
  .put(authenticateToken, validate(updateEmployeeFinancialSchema), employeeFinancialController.update)
  .delete(authenticateToken, validate(employeeFinancialParamsSchema), employeeFinancialController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(employeeFinancialParamsSchema), employeeFinancialController.restore)
;

export default router;
