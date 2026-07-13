import express from "express";
import payrollSettingsController from "./payroll-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPayrollSettingsSchema,
  updatePayrollSettingsSchema,
  paramsPayrollSettingsSchema,
  paramsPayrollSettingsIdsSchema,
  queryPayrollSettingsSchema,
} from "./payroll-settings.validation.js";

const router = express.Router();

router.route("/")
  .post(
    authenticateToken,
    authorize("PayrollSettings", "create"),
    checkModuleEnabled("hr"),
    validate(createPayrollSettingsSchema),
    payrollSettingsController.create,
  )
  .get(
    authenticateToken,
    authorize("PayrollSettings", "read"),
    checkModuleEnabled("hr"),
    validate(queryPayrollSettingsSchema),
    payrollSettingsController.getAll,
  );

router.route("/resolve").get(
  authenticateToken,
  authorize("PayrollSettings", "read"),
  checkModuleEnabled("hr"),
  payrollSettingsController.resolve,
);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("PayrollSettings", "read"),
    checkModuleEnabled("hr"),
    validate(paramsPayrollSettingsSchema, "params"),
    payrollSettingsController.getOne,
  )
  .put(
    authenticateToken,
    authorize("PayrollSettings", "update"),
    checkModuleEnabled("hr"),
    validate(updatePayrollSettingsSchema),
    payrollSettingsController.update,
  )
  .delete(
    authenticateToken,
    authorize("PayrollSettings", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsPayrollSettingsSchema, "params"),
    payrollSettingsController.hardDelete,
  );

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("PayrollSettings", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollSettingsSchema, "params"),
  payrollSettingsController.softDelete,
);

router.route("/restore/:id").patch(
  authenticateToken,
  authorize("PayrollSettings", "update"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollSettingsSchema, "params"),
  payrollSettingsController.restore,
);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above — left broken for consistency with every other HR router pending
// the dedicated Foundation pass, not fixed here.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("PayrollSettings", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollSettingsIdsSchema),
  payrollSettingsController.bulkHardDelete,
);

router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("PayrollSettings", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsPayrollSettingsIdsSchema),
  payrollSettingsController.bulkSoftDelete,
);

export default router;
