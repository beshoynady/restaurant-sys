import express from "express";
import payrollController from "../../controllers/employees/payroll.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPayrollSchema, 
  updatePayrollSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/payroll.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPayrollSchema), payrollController.create)
  .get(authenticateToken, validate(querySchema()), payrollController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), payrollController.getOne)
  .put(authenticateToken, validate(updatePayrollSchema), payrollController.update)
  .delete(authenticateToken, validate(paramsSchema()), payrollController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), payrollController.restore)
;

export default router;
