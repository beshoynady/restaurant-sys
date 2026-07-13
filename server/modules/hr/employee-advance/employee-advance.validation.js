import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import EmployeeAdvanceModel from "./employee-advance.model.js";
import { ADVANCE_STATUSES } from "./employee-advance.model.js";

// Every workflow/server-managed field is excluded from create/update —
// state changes only happen through the dedicated
// submit/review/approve/reject/disburse/cancel/recordRepayment/
// pauseDeductions/resumeDeductions/close/settleOnTermination service
// methods, never a raw field write. See EMPLOYEE_ADVANCE.module.md §5.
const WORKFLOW_FIELDS = [
  "status",
  "installmentAmount",
  "remainingBalance",
  "submittedBy",
  "submittedAt",
  "reviewedBy",
  "reviewedAt",
  "approvedBy",
  "approvedAt",
  "rejectedBy",
  "rejectedAt",
  "rejectionReason",
  "disbursedBy",
  "disbursedAt",
  "disbursementMethod",
  "cancelledBy",
  "cancelledAt",
  "cancellationReason",
  "closedBy",
  "closedAt",
  "settlement",
  "payments",
];

export const createEmployeeAdvanceSchema = createSchema(EmployeeAdvanceModel.schema, {
  exclude: WORKFLOW_FIELDS,
});

export const updateEmployeeAdvanceSchema = updateSchema(EmployeeAdvanceModel.schema, {
  exclude: ["updatedBy", "employee", "brand", ...WORKFLOW_FIELDS],
});

export const paramsEmployeeAdvanceSchema = paramsSchema();
export const paramsEmployeeAdvanceIdsSchema = paramsIdsSchema();

export const queryEmployeeAdvanceSchema = querySchema({
  employee: objectId().optional(),
  branch: objectId().optional(),
  status: Joi.string().valid(...ADVANCE_STATUSES).optional(),
});
