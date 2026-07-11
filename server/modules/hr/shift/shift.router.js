import express from "express";
import shiftController from "./shift.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createShiftSchema,
  updateShiftSchema,
  paramsShiftSchema,
  paramsShiftIdsSchema,
  queryShiftSchema,
} from "./shift.validation.js";

const router = express.Router();

/**
 * Notes (EN):
 * - This router follows BaseController conventions (pagination/search/soft delete).
 * - `GET /count` is added for dashboard widgets (HR/restaurant operational counts).
 */

// Create & GetAll
router.route("/").post(
  authenticateToken,
    authorize("Shifts", "create"),
    checkModuleEnabled("hr"),
  validate(createShiftSchema),
  shiftController.create,
);

router.route("/").get(
  authenticateToken,
    authorize("Shifts", "read"),
    checkModuleEnabled("hr"),
  validate(queryShiftSchema),
  shiftController.getAll,
);

// Count (supports same filters as list)
router.route("/count").get(
  authenticateToken,
    authorize("Shifts", "read"),
    checkModuleEnabled("hr"),
  validate(queryShiftSchema),
  shiftController.count,
);

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Shifts", "read"),
    checkModuleEnabled("hr"), validate(paramsShiftSchema), shiftController.getOne)
  .put(authenticateToken,
    authorize("Shifts", "update"),
    checkModuleEnabled("hr"), validate(updateShiftSchema), shiftController.update)
  .delete(authenticateToken,
    authorize("Shifts", "delete"),
    checkModuleEnabled("hr"), validate(paramsShiftSchema), shiftController.hardDelete);

// Soft Delete
router.route("/soft-delete/:id").patch(
  authenticateToken,
    authorize("Shifts", "delete"),
    checkModuleEnabled("hr"),
  validate(paramsShiftSchema),
  shiftController.softDelete,
);

// Restore soft-deleted item
router.route("/restore/:id").patch(
  authenticateToken,
    authorize("Shifts", "update"),
    checkModuleEnabled("hr"),
  validate(paramsShiftSchema),
  shiftController.restore,
);

// --- BULK HARD DELETE ---
router.route("/bulk-delete").delete(
  authenticateToken,
    authorize("Shifts", "delete"),
    checkModuleEnabled("hr"),
  validate(paramsShiftIdsSchema),
  shiftController.bulkHardDelete,
);

// --- BULK SOFT DELETE ---
router.route("/bulk-soft-delete").patch(
  authenticateToken,
    authorize("Shifts", "delete"),
    checkModuleEnabled("hr"),
  validate(paramsShiftIdsSchema),
  shiftController.bulkSoftDelete,
);

export default router;
