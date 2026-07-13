import express from "express";
import employeeFinancialProfileController from "./employee-financial-profile.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createEmployeeFinancialProfileSchema,
  updateEmployeeFinancialProfileSchema,
  paramsEmployeeFinancialProfileSchema,
  paramsEmployeeFinancialProfileIdsSchema,
  queryEmployeeFinancialProfileSchema,
} from "./employee-financial-profile.validation.js";

const router = express.Router();

// Previously this router had NO authorize()/checkModuleEnabled() at all —
// worse than HD-001 (JobTitle had the same gap, fixed at that module's own
// turn) — any authenticated user, regardless of role, could read/write
// every employee's salary and bank details. Every route below now follows
// the standard chain every other HR router uses.

router.route("/")
  .post(
    authenticateToken,
    authorize("EmployeeFinancial", "create"),
    checkModuleEnabled("hr"),
    validate(createEmployeeFinancialProfileSchema),
    employeeFinancialProfileController.create,
  )
  .get(
    authenticateToken,
    authorize("EmployeeFinancial", "read"),
    checkModuleEnabled("hr"),
    validate(queryEmployeeFinancialProfileSchema),
    employeeFinancialProfileController.getAll,
  );

// Employee-keyed lookups — the profile is 1:1 with Employee, and the
// frontend virtually always has an employee id in context, not the
// profile's own id.
router.route("/employee/:employeeId").get(
  authenticateToken,
  authorize("EmployeeFinancial", "read"),
  checkModuleEnabled("hr"),
  employeeFinancialProfileController.getByEmployee,
);

router.route("/employee/:employeeId/eligibility").get(
  authenticateToken,
  authorize("EmployeeFinancial", "read"),
  checkModuleEnabled("hr"),
  employeeFinancialProfileController.eligibility,
);

router.route("/employee/:employeeId/summary").get(
  authenticateToken,
  authorize("EmployeeFinancial", "read"),
  checkModuleEnabled("hr"),
  employeeFinancialProfileController.summary,
);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("EmployeeFinancial", "read"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeFinancialProfileSchema, "params"),
    employeeFinancialProfileController.getOne,
  )
  .put(
    authenticateToken,
    authorize("EmployeeFinancial", "update"),
    checkModuleEnabled("hr"),
    validate(updateEmployeeFinancialProfileSchema),
    employeeFinancialProfileController.update,
  )
  .delete(
    authenticateToken,
    authorize("EmployeeFinancial", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeFinancialProfileSchema, "params"),
    employeeFinancialProfileController.hardDelete,
  );

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("EmployeeFinancial", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialProfileSchema, "params"),
  employeeFinancialProfileController.softDelete,
);

router.route("/restore/:id").patch(
  authenticateToken,
  authorize("EmployeeFinancial", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialProfileSchema, "params"),
  employeeFinancialProfileController.restore,
);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above — left broken for consistency with every other HR router pending
// the dedicated Foundation pass, not fixed here.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("EmployeeFinancial", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialProfileIdsSchema),
  employeeFinancialProfileController.bulkHardDelete,
);

router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("EmployeeFinancial", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialProfileIdsSchema),
  employeeFinancialProfileController.bulkSoftDelete,
);

export default router;
