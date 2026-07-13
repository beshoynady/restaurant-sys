import express from "express";
import employeeFinancialTransactionController from "./employee-financial-transaction.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createEmployeeFinancialTransactionSchema,
  updateEmployeeFinancialTransactionSchema,
  paramsEmployeeFinancialTransactionSchema,
  paramsEmployeeFinancialTransactionIdsSchema,
  queryEmployeeFinancialTransactionSchema,
} from "./employee-financial-transaction.validation.js";

const router = express.Router();

// Previously this router had NO authorize()/checkModuleEnabled() at all —
// any authenticated user could read/write every employee's financial
// transaction ledger regardless of role. Every route below now follows the
// standard chain every other HR router in this rollout uses.

router.route("/")
  .post(
    authenticateToken,
    authorize("EmployeeTransactions", "create"),
    checkModuleEnabled("hr"),
    validate(createEmployeeFinancialTransactionSchema),
    employeeFinancialTransactionController.create,
  )
  .get(
    authenticateToken,
    authorize("EmployeeTransactions", "read"),
    checkModuleEnabled("hr"),
    validate(queryEmployeeFinancialTransactionSchema),
    employeeFinancialTransactionController.getAll,
  );

// Payroll-first: monthly totals ready to feed a payslip preview.
router.route("/summary/monthly").get(
  authenticateToken,
  authorize("EmployeeTransactions", "read"),
  checkModuleEnabled("hr"),
  employeeFinancialTransactionController.monthlySummary,
);

router.route("/:id")
  .get(
    authenticateToken,
    authorize("EmployeeTransactions", "read"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeFinancialTransactionSchema, "params"),
    employeeFinancialTransactionController.getOne,
  )
  .put(
    authenticateToken,
    authorize("EmployeeTransactions", "update"),
    checkModuleEnabled("hr"),
    validate(updateEmployeeFinancialTransactionSchema),
    employeeFinancialTransactionController.update,
  )
  .delete(
    authenticateToken,
    authorize("EmployeeTransactions", "delete"),
    checkModuleEnabled("hr"),
    validate(paramsEmployeeFinancialTransactionSchema, "params"),
    employeeFinancialTransactionController.hardDelete,
  );

// Approval / cancellation workflow — the only routes that may set
// isApproved/isCancelled (see service.approve()/cancel()).
router.route("/:id/approve").patch(
  authenticateToken,
  authorize("EmployeeTransactions", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialTransactionSchema, "params"),
  employeeFinancialTransactionController.approve,
);

router.route("/:id/cancel").patch(
  authenticateToken,
  authorize("EmployeeTransactions", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialTransactionSchema, "params"),
  employeeFinancialTransactionController.cancel,
);

router.route("/soft-delete/:id").patch(
  authenticateToken,
  authorize("EmployeeTransactions", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialTransactionSchema, "params"),
  employeeFinancialTransactionController.softDelete,
);

router.route("/restore/:id").patch(
  authenticateToken,
  authorize("EmployeeTransactions", "update"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialTransactionSchema, "params"),
  employeeFinancialTransactionController.restore,
);

// NOTE (BACKEND_FOUNDATION_TECH_DEBT.md FT-001): shadowed by "/:id" DELETE
// above — left broken for consistency with every other HR router pending
// the dedicated Foundation pass, not fixed here.
router.route("/bulk-delete").delete(
  authenticateToken,
  authorize("EmployeeTransactions", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialTransactionIdsSchema),
  employeeFinancialTransactionController.bulkHardDelete,
);

router.route("/bulk-soft-delete").patch(
  authenticateToken,
  authorize("EmployeeTransactions", "delete"),
  checkModuleEnabled("hr"),
  validate(paramsEmployeeFinancialTransactionIdsSchema),
  employeeFinancialTransactionController.bulkSoftDelete,
);

export default router;
