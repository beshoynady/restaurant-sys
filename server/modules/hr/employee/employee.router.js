import express from "express";
import employeeController from "./employee.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  paramsEmployeeSchema,
  paramsEmployeeIdsSchema,
  queryEmployeeSchema,
} from "./employee.validation.js";

const router = express.Router();

/**
 * Notes (EN):
 * - This router follows BaseController conventions (pagination/search/soft delete).
 * - `GET /count` is added for dashboard widgets (HR/restaurant operational counts).
 */

// Create & GetAll
router.route("/").post(
  authenticateToken,
    authorize("Employees", "create"),
    checkModuleEnabled("hr"),
  validate(createEmployeeSchema),
  employeeController.create,
);

router.route("/").get(
  authenticateToken,
    authorize("Employees", "read"),
    checkModuleEnabled("hr"),
  validate(queryEmployeeSchema),
  employeeController.getAll,
);

// Count (supports same filters as list)
router.route("/count").get(
  authenticateToken,
    authorize("Employees", "read"),
    checkModuleEnabled("hr"),
  validate(queryEmployeeSchema),
  employeeController.count,
);

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Employees", "read"),
    checkModuleEnabled("hr"), validate(paramsEmployeeSchema), employeeController.getOne)
  .put(authenticateToken,
    authorize("Employees", "update"),
    checkModuleEnabled("hr"), validate(updateEmployeeSchema), employeeController.update)
  .delete(
    authenticateToken,
    authorize("Employees", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeSchema),
    employeeController.hardDelete,
  );

// Soft Delete
router.route("/soft-delete/:id").patch(
  authenticateToken,
    authorize("Employees", "delete"),
    checkModuleEnabled("hr"),
  validate(paramsEmployeeSchema),
  employeeController.softDelete,
);

// Restore soft-deleted item
router.route("/restore/:id").patch(
  authenticateToken,
    authorize("Employees", "update"),
    checkModuleEnabled("hr"),
  validate(paramsEmployeeSchema),
  employeeController.restore,
);

// --- BULK HARD DELETE ---
router.route("/bulk-delete").delete(
  authenticateToken,
    authorize("Employees", "delete"),
    checkModuleEnabled("hr"),
  validate(paramsEmployeeIdsSchema),
  employeeController.bulkHardDelete,
);

// --- BULK SOFT DELETE ---
router.route("/bulk-soft-delete").patch(
  authenticateToken,
    authorize("Employees", "delete"),
    checkModuleEnabled("hr"),
  validate(paramsEmployeeIdsSchema),
  employeeController.bulkSoftDelete,
);

export default router;
