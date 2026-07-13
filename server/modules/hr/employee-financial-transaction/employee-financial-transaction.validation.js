import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import Joi from "joi";
import EmployeeFinancialTransactionModel from "./employee-financial-transaction.model.js";

// `payrollEffect` is server-derived from `category` (see
// employee-financial-transaction.service.js#derivePayrollEffect) — never
// client-writable. The approval/cancellation workflow fields
// (isApproved/approvedBy/approvedAt/isCancelled/cancelledBy/cancelledAt/
// cancellationReason/isPayrollProcessed) are only ever set by the dedicated
// approve()/cancel() service methods, never through create/update — see
// EMPLOYEE_FINANCIAL_TRANSACTION.module.md §5.
const WORKFLOW_FIELDS = [
  "payrollEffect",
  "isApproved",
  "approvedBy",
  "approvedAt",
  "isCancelled",
  "cancelledBy",
  "cancelledAt",
  "cancellationReason",
  "isPayrollProcessed",
];

/* =========================
   Create Schema
========================= */
export const createEmployeeFinancialTransactionSchema = createSchema(EmployeeFinancialTransactionModel.schema, {
  exclude: WORKFLOW_FIELDS,
});

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array (`["updatedBy"]`) instead of
// `{exclude: [...]}` — silently a no-op, corrected for clarity (same fix
// applied throughout this HR rollout).
export const updateEmployeeFinancialTransactionSchema = updateSchema(EmployeeFinancialTransactionModel.schema, {
  exclude: ["updatedBy", "employee", "brand", ...WORKFLOW_FIELDS],
});

/* =========================
   Params Schema
========================= */
export const paramsEmployeeFinancialTransactionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeFinancialTransactionIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryEmployeeFinancialTransactionSchema = querySchema({
  employee: objectId().optional(),
  branch: objectId().optional(),
  category: Joi.string().valid("earning", "deduction").optional(),
  type: Joi.string().optional(),
  payrollMonth: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  isApproved: Joi.boolean().optional(),
  isCancelled: Joi.boolean().optional(),
  isPayrollProcessed: Joi.boolean().optional(),
});
