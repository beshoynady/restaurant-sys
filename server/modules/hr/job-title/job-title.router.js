import express from "express";
import jobTitleController from "./job-title.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createJobTitleSchema,
  updateJobTitleSchema,
  paramsJobTitleSchema,
  paramsJobTitleIdsSchema,
  queryJobTitleSchema,
} from "./job-title.validation.js";

const router = express.Router();

// HD-001 (HR_TECHNICAL_DEBT.md): this router previously had NO authorize()
// or checkModuleEnabled() on any route — any authenticated user, regardless
// of role/permissions, could create/read/update/delete job titles. Every
// route below now follows the same authorize+checkModuleEnabled("hr")
// chain every other HR router uses (Employee, Department, Shift, Payroll).

// Create & GetAll
router.route("/")
  .post(
    authenticateToken,
    authorize("JobTitles", "create"),
    checkModuleEnabled("hr"),
    validate(createJobTitleSchema),
    jobTitleController.create,
  )
  .get(
    authenticateToken,
    authorize("JobTitles", "read"),
    checkModuleEnabled("hr"),
    validate(queryJobTitleSchema),
    jobTitleController.getAll,
  );

// Stats — "positions per department"
router.route("/count-by-department").get(
  authenticateToken,
  authorize("JobTitles", "read"),
  checkModuleEnabled("hr"),
  jobTitleController.countByDepartment,
);

// GetOne, Update, hardDelete
router.route("/:id")
  .get(
    authenticateToken,
    authorize("JobTitles", "read"),
    checkModuleEnabled("hr"),
    validate(paramsJobTitleSchema, "params"),
    jobTitleController.getOne,
  )
  .put(
    authenticateToken,
    authorize("JobTitles", "update"),
    checkModuleEnabled("hr"),
    validate(updateJobTitleSchema),
    jobTitleController.update,
  )
  .delete(
    authenticateToken,
    authorize("JobTitles", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsJobTitleSchema, "params"),
    jobTitleController.hardDelete,
  );

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("JobTitles", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsJobTitleSchema, "params"),
  jobTitleController.softDelete,
);

// Restore soft-deleted item
router.route("/restore/:id").patch(
  authenticateToken,
  authorize("JobTitles", "update"),
  checkModuleEnabled("hr"),
  validate(paramsJobTitleSchema, "params"),
  jobTitleController.restore,
);

// --- BULK HARD DELETE ---
// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): this route is currently
// unreachable — it's shadowed by "/:id" DELETE registered above it, and
// Express matches in registration order. Not fixed here (Foundation issue,
// out of scope for this module's rollout) — left in the same broken state
// as every other HR router's equivalent route for consistency until the
// dedicated Foundation pass.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("JobTitles", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsJobTitleIdsSchema),
  jobTitleController.bulkHardDelete,
);

// --- BULK SOFT DELETE ---
router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("JobTitles", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsJobTitleIdsSchema),
  jobTitleController.bulkSoftDelete,
);

export default router;
