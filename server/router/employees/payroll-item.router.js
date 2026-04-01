import express from "express";
import payrollItemController from "../../controllers/employees/payroll-item.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPayrollItemSchema, 
  updatePayrollItemSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/payroll-item.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPayrollItemSchema), payrollItemController.create)
  .get(authenticateToken, validate(querySchema()), payrollItemController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), payrollItemController.getOne)
  .put(authenticateToken, validate(updatePayrollItemSchema), payrollItemController.update)
  .delete(authenticateToken, validate(paramsSchema()), payrollItemController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), payrollItemController.restore)
;

export default router;
