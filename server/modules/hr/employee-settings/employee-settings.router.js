import express from "express";
import employeeSettingsController from "./employee-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createEmployeeSettingsSchema,
  updateEmployeeSettingsSchema,
  paramsEmployeeSettingsSchema,
  paramsEmployeeSettingsIdsSchema,
  queryEmployeeSettingsSchema
} from "./employee-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("EmployeeSettings", "create"), checkModuleEnabled("hr"), validate(createEmployeeSettingsSchema), employeeSettingsController.create)
  .get(authenticateToken, authorize("EmployeeSettings", "read"), checkModuleEnabled("hr"), validate(queryEmployeeSettingsSchema), employeeSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("EmployeeSettings", "read"), checkModuleEnabled("hr"), validate(paramsEmployeeSettingsSchema), employeeSettingsController.getOne)
  .put(authenticateToken, authorize("EmployeeSettings", "update"), checkModuleEnabled("hr"), validate(updateEmployeeSettingsSchema), employeeSettingsController.update)
  .delete(authenticateToken, authorize("EmployeeSettings", "delete"), checkModuleEnabled("hr"), validate(paramsEmployeeSettingsSchema), employeeSettingsController.hardDelete)
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("EmployeeSettings", "delete"), checkModuleEnabled("hr"), validate(paramsEmployeeSettingsSchema), employeeSettingsController.softDelete)
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("EmployeeSettings", "update"), checkModuleEnabled("hr"), validate(paramsEmployeeSettingsSchema), employeeSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("EmployeeSettings", "delete"), checkModuleEnabled("hr"), validate(paramsEmployeeSettingsIdsSchema), employeeSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("EmployeeSettings", "delete"), checkModuleEnabled("hr"), validate(paramsEmployeeSettingsIdsSchema), employeeSettingsController.bulkSoftDelete);


export default router;
