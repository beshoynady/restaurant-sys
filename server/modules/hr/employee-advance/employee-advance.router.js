import express from "express";
import employeeAdvanceController from "./employee-advance.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createEmployeeAdvanceSchema,
  updateEmployeeAdvanceSchema,
  paramsEmployeeAdvanceSchema,
  paramsEmployeeAdvanceIdsSchema,
  queryEmployeeAdvanceSchema,
} from "./employee-advance.validation.js";

const router = express.Router();

// Previously this router had NO authorize()/checkModuleEnabled() at all,
// AND its service was incompatible with BaseController (HD-012) — every
// route below is both newly secured and newly functional.

router.route("/")
  .post(
    authenticateToken,
    authorize("EmployeeAdvances", "create"),
    checkModuleEnabled("hr"),
    validate(createEmployeeAdvanceSchema),
    employeeAdvanceController.create,
  )
  .get(
    authenticateToken,
    authorize("EmployeeAdvances", "read"),
    checkModuleEnabled("hr"),
    validate(queryEmployeeAdvanceSchema),
    employeeAdvanceController.getAll,
  );

// ===== Reports / dashboard (registered before "/:id" to avoid FT-001-style shadowing) =====
router.route("/reports/overdue").get(
  authenticateToken,
  authorize("EmployeeAdvances", "read"),
  checkModuleEnabled("hr"),
  employeeAdvanceController.overdue,
);
router.route("/reports/branch-summary").get(
  authenticateToken,
  authorize("EmployeeAdvances", "read"),
  checkModuleEnabled("hr"),
  employeeAdvanceController.branchSummary,
);
router.route("/reports/department-summary").get(
  authenticateToken,
  authorize("EmployeeAdvances", "read"),
  checkModuleEnabled("hr"),
  employeeAdvanceController.departmentSummary,
);

// ===== Employee-keyed lookups =====
router.route("/employee/:employeeId/payroll-preview").get(
  authenticateToken,
  authorize("EmployeeAdvances", "read"),
  checkModuleEnabled("hr"),
  employeeAdvanceController.payrollPreview,
);
router.route("/employee/:employeeId/summary").get(
  authenticateToken,
  authorize("EmployeeAdvances", "read"),
  checkModuleEnabled("hr"),
  employeeAdvanceController.employeeSummary,
);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("EmployeeAdvances", "read"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeAdvanceSchema, "params"),
    employeeAdvanceController.getOne,
  )
  .put(
    authenticateToken,
    authorize("EmployeeAdvances", "update"),
    checkModuleEnabled("hr"),
    validate(updateEmployeeAdvanceSchema),
    employeeAdvanceController.update,
  )
  .delete(
    authenticateToken,
    authorize("EmployeeAdvances", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeAdvanceSchema, "params"),
    employeeAdvanceController.hardDelete,
  );

router.route("/:id/schedule").get(
  authenticateToken,
  authorize("EmployeeAdvances", "read"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.schedule,
);

// ===== Workflow transitions — the only routes that may change `status` =====
router.route("/:id/submit").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.submit,
);
router.route("/:id/review").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.review,
);
router.route("/:id/approve").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "approve"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.approve,
);
router.route("/:id/reject").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "reject"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.reject,
);
router.route("/:id/disburse").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.disburse,
);
router.route("/:id/cancel").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.cancel,
);
router.route("/:id/repayments").post(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.recordRepayment,
);
router.route("/:id/pause-deductions").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.pauseDeductions,
);
router.route("/:id/resume-deductions").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.resumeDeductions,
);
router.route("/:id/close").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.close,
);
router.route("/:id/settle").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.settleOnTermination,
);

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.softDelete,
);

router.route("/restore/:id").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceSchema, "params"),
  employeeAdvanceController.restore,
);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above — left broken for consistency with every other HR router pending
// the dedicated Foundation pass, not fixed here.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("EmployeeAdvances", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceIdsSchema),
  employeeAdvanceController.bulkHardDelete,
);

router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("EmployeeAdvances", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeAdvanceIdsSchema),
  employeeAdvanceController.bulkSoftDelete,
);

export default router;
