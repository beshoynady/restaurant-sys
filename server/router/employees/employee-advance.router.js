import express from "express";
import employeeAdvanceController from "../../controllers/employees/employee-advance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createEmployeeAdvanceSchema, 
  updateEmployeeAdvanceSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/employee-advance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeAdvanceSchema), employeeAdvanceController.create)
  .get(authenticateToken, validate(querySchema()), employeeAdvanceController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), employeeAdvanceController.getOne)
  .put(authenticateToken, validate(updateEmployeeAdvanceSchema), employeeAdvanceController.update)
  .delete(authenticateToken, validate(paramsSchema()), employeeAdvanceController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), employeeAdvanceController.restore)
;

export default router;
