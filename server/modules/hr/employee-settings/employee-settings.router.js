import express from "express";
import employeeSettingsController from "../../controllers/employees/employee-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createEmployeeSettingsSchema, 
  updateEmployeeSettingsSchema, 
  paramsEmployeeSettingsSchema, 
  paramsEmployeeSettingsIdsSchema,
  queryEmployeeSettingsSchema 
} from "../../validation/employees/employee-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeSettingsSchema), employeeSettingsController.create)
  .get(authenticateToken, validate(queryEmployeeSettingsSchema), employeeSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsEmployeeSettingsSchema), employeeSettingsController.getOne)
  .put(authenticateToken, validate(updateEmployeeSettingsSchema), employeeSettingsController.update)
  .delete(authenticateToken, validate(paramsEmployeeSettingsSchema), employeeSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsEmployeeSettingsSchema), employeeSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsEmployeeSettingsSchema), employeeSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsEmployeeSettingsIdsSchema), employeeSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsEmployeeSettingsIdsSchema), employeeSettingsController.bulkSoftDelete);


export default router;
