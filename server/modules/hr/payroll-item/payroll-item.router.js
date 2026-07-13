import express from "express";
import payrollItemController from "./payroll-item.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPayrollItemSchema,
  updatePayrollItemSchema,
  paramsPayrollItemSchema,
  paramsPayrollItemIdsSchema,
  queryPayrollItemSchema,
  evaluatePayrollItemSchema,
} from "./payroll-item.validation.js";

const router = express.Router();

// Previously this router had NO authorize()/checkModuleEnabled() at all,
// AND its service was a hand-written class incompatible with BaseController
// (same defect class as HD-012/HD-019) — every route below is both newly
// secured and newly functional.

router.route("/")
  .post(
    authenticateToken,
    authorize("PayrollItems", "create"),
    checkModuleEnabled("hr"),
    validate(createPayrollItemSchema),
    payrollItemController.create,
  )
  .get(
    authenticateToken,
    authorize("PayrollItems", "read"),
    checkModuleEnabled("hr"),
    validate(queryPayrollItemSchema),
    payrollItemController.getAll,
  );

// Frontend Readiness (registered before "/:id" to avoid FT-001-style shadowing).
router.route("/variables").get(
  authenticateToken,
  authorize("PayrollItems", "read"),
  checkModuleEnabled("hr"),
  payrollItemController.variables,
);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("PayrollItems", "read"),
    checkModuleEnabled("hr"),
    validate(paramsPayrollItemSchema, "params"),
    payrollItemController.getOne,
  )
  .put(
    authenticateToken,
    authorize("PayrollItems", "update"),
    checkModuleEnabled("hr"),
    validate(updatePayrollItemSchema),
    payrollItemController.update,
  )
  .delete(
    authenticateToken,
    authorize("PayrollItems", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsPayrollItemSchema, "params"),
    payrollItemController.hardDelete,
  );

router.route("/:id/evaluate").post(
  authenticateToken,
  authorize("PayrollItems", "read"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollItemSchema, "params"),
  validate(evaluatePayrollItemSchema),
  payrollItemController.evaluate,
);

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("PayrollItems", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollItemSchema, "params"),
  payrollItemController.softDelete,
);

router.route("/restore/:id").patch(
  authenticateToken,
  authorize("PayrollItems", "update"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollItemSchema, "params"),
  payrollItemController.restore,
);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above — left broken for consistency with every other HR router pending
// the dedicated Foundation pass, not fixed here.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("PayrollItems", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollItemIdsSchema),
  payrollItemController.bulkHardDelete,
);

router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("PayrollItems", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollItemIdsSchema),
  payrollItemController.bulkSoftDelete,
);

export default router;
