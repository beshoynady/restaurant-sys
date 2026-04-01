import express from "express";
import employeeController from "../../controllers/employees/employee.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createEmployeeSchema, updateEmployeeSchema, employeeParamsSchema, employeeQuerySchema } from "../../validation/employees/employee.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeSchema), employeeController.create)
  .get(authenticateToken, validate(employeeQuerySchema), employeeController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(employeeParamsSchema), employeeController.getOne)
  .put(authenticateToken, validate(updateEmployeeSchema), employeeController.update)
  .delete(authenticateToken, validate(employeeParamsSchema), employeeController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(employeeParamsSchema), employeeController.restore)
;

export default router;
