import express from "express";
import employeeController from "./employee.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  validate(createEmployeeSchema),
  employeeController.create,
);

router.route("/").get(
  authenticateToken,
  validate(queryEmployeeSchema),
  employeeController.getAll,
);

// Count (supports same filters as list)
router.route("/count").get(
  authenticateToken,
  validate(queryEmployeeSchema),
  employeeController.count,
);

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsEmployeeSchema), employeeController.getOne)
  .put(authenticateToken, validate(updateEmployeeSchema), employeeController.update)
  .delete(
    authenticateToken,
    validate(paramsEmployeeSchema),
    employeeController.hardDelete,
  );

// Soft Delete
router.route("/soft-delete/:id").patch(
  authenticateToken,
  validate(paramsEmployeeSchema),
  employeeController.softDelete,
);

// Restore soft-deleted item
router.route("/restore/:id").patch(
  authenticateToken,
  validate(paramsEmployeeSchema),
  employeeController.restore,
);

// --- BULK HARD DELETE ---
router.route("/bulk-delete").delete(
  authenticateToken,
  validate(paramsEmployeeIdsSchema),
  employeeController.bulkHardDelete,
);

// --- BULK SOFT DELETE ---
router.route("/bulk-soft-delete").patch(
  authenticateToken,
  validate(paramsEmployeeIdsSchema),
  employeeController.bulkSoftDelete,
);

export default router;
