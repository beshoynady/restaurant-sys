import express from "express";
import employeeAdvanceController from "../../controllers/employees/employee-advance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createEmployeeAdvanceSchema, updateEmployeeAdvanceSchema, employeeAdvanceParamsSchema, employeeAdvanceQuerySchema } from "../../validation/employees/employee-advance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeAdvanceSchema), employeeAdvanceController.create)
  .get(authenticateToken, validate(employeeAdvanceQuerySchema), employeeAdvanceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(employeeAdvanceParamsSchema), employeeAdvanceController.getOne)
  .put(authenticateToken, validate(updateEmployeeAdvanceSchema), employeeAdvanceController.update)
  .delete(authenticateToken, validate(employeeAdvanceParamsSchema), employeeAdvanceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(employeeAdvanceParamsSchema), employeeAdvanceController.restore)
;

export default router;
