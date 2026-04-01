import express from "express";
import employeeFinancialController from "../../controllers/employees/employee-financial.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createEmployeeFinancialSchema, 
  updateEmployeeFinancialSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/employee-financial.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeFinancialSchema), employeeFinancialController.create)
  .get(authenticateToken, validate(querySchema()), employeeFinancialController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), employeeFinancialController.getOne)
  .put(authenticateToken, validate(updateEmployeeFinancialSchema), employeeFinancialController.update)
  .delete(authenticateToken, validate(paramsSchema()), employeeFinancialController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), employeeFinancialController.restore)
;

export default router;
