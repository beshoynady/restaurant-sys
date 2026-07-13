import express from "express";
import leaveRequestController from "./leave-request.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
  paramsLeaveRequestSchema,
  paramsLeaveRequestIdsSchema,
  queryLeaveRequestSchema,
} from "./leave-request.validation.js";

const router = express.Router();

// Previously this router had NO authorize()/checkModuleEnabled() at all,
// AND its service was a hand-written class incompatible with BaseController
// (same defect class as HD-012) — every route below is both newly secured
// and newly functional.

router.route("/")
  .post(
    authenticateToken,
    authorize("LeaveRequests", "create"),
    checkModuleEnabled("hr"),
    validate(createLeaveRequestSchema),
    leaveRequestController.create,
  )
  .get(
    authenticateToken,
    authorize("LeaveRequests", "read"),
    checkModuleEnabled("hr"),
    validate(queryLeaveRequestSchema),
    leaveRequestController.getAll,
  );

// ===== Frontend-ready reads / dashboard (registered before "/:id") =====
router.route("/pending").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.pending);
router.route("/calendar").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.calendar);
router.route("/upcoming").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.upcoming);

router.route("/reports/branch-summary").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.branchSummary);
router.route("/reports/department-summary").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.departmentSummary);
router.route("/reports/type-summary").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.typeSummary);
router.route("/reports/payroll-impact").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.payrollImpact);

router.route("/employee/:employeeId/balance").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.balance);
router.route("/employee/:employeeId/balances").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.balances);
router.route("/employee/:employeeId/history").get(authenticateToken, authorize("LeaveRequests", "read"), checkModuleEnabled("hr"), leaveRequestController.history);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("LeaveRequests", "read"),
    checkModuleEnabled("hr"),
    validate(paramsLeaveRequestSchema, "params"),
    leaveRequestController.getOne,
  )
  .put(
    authenticateToken,
    authorize("LeaveRequests", "update"),
    checkModuleEnabled("hr"),
    validate(updateLeaveRequestSchema),
    leaveRequestController.update,
  )
  .delete(
    authenticateToken,
    authorize("LeaveRequests", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsLeaveRequestSchema, "params"),
    leaveRequestController.hardDelete,
  );

// ===== Workflow — the only routes that may change `status` =====
router.route("/:id/submit").patch(authenticateToken, authorize("LeaveRequests", "update"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.submit);
router.route("/:id/manager-review").patch(authenticateToken, authorize("LeaveRequests", "approve"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.managerReview);
router.route("/:id/hr-review").patch(authenticateToken, authorize("LeaveRequests", "approve"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.hrReview);
router.route("/:id/cancel").patch(authenticateToken, authorize("LeaveRequests", "update"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.cancel);
router.route("/:id/complete").patch(authenticateToken, authorize("LeaveRequests", "update"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.complete);
router.route("/:id/close").patch(authenticateToken, authorize("LeaveRequests", "update"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.close);
router.route("/:id/recall").patch(authenticateToken, authorize("LeaveRequests", "update"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.recall);

router.route("/soft-delete/:id").patch(authenticateToken, authorize("LeaveRequests", "delete"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.softDelete);
router.route("/restore/:id").patch(authenticateToken, authorize("LeaveRequests", "update"), checkModuleEnabled("hr"), validate(paramsLeaveRequestSchema, "params"), leaveRequestController.restore);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above — left broken for consistency with every other HR router pending
// the dedicated Foundation pass, not fixed here.
router.route("/bulk-delete").delete(authenticateToken, authorize("LeaveRequests", "delete"), checkModuleEnabled("hr"), validate(paramsLeaveRequestIdsSchema), leaveRequestController.bulkHardDelete);
router.route("/bulk-soft-delete").patch(authenticateToken, authorize("LeaveRequests", "delete"), checkModuleEnabled("hr"), validate(paramsLeaveRequestIdsSchema), leaveRequestController.bulkSoftDelete);

export default router;
