import express from "express";
import employeeSettingsController from "../../controllers/employees/employee-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createEmployeeSettingsSchema, 
  updateEmployeeSettingsSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/employee-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeSettingsSchema), employeeSettingsController.create)
  .get(authenticateToken, validate(querySchema()), employeeSettingsController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), employeeSettingsController.getOne)
  .put(authenticateToken, validate(updateEmployeeSettingsSchema), employeeSettingsController.update)
  .delete(authenticateToken, validate(paramsSchema()), employeeSettingsController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), employeeSettingsController.restore)
;

export default router;
