import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import LeaveRequestModel, { LEAVE_TYPES } from "./leave-request.model.js";

// Server-computed/workflow fields — never client-writable. See
// LEAVE_REQUEST.module.md §3/§5.
const WORKFLOW_FIELDS = [
  "status",
  "payrollTreatment",
  "isPaid",
  "submittedBy",
  "submittedAt",
  "managerReviewedBy",
  "managerReviewedAt",
  "managerDecision",
  "managerComment",
  "hrReviewedBy",
  "hrReviewedAt",
  "hrDecision",
  "hrComment",
  "approvedBy",
  "approvedAt",
  "rejectedBy",
  "rejectedAt",
  "rejectionReason",
  "cancelledBy",
  "cancelledAt",
  "cancellationReason",
  "closedBy",
  "closedAt",
  "recalledBy",
  "recalledAt",
  "recallReason",
  "recalledOriginalEndDate",
  "attendanceGenerated",
  "payrollProcessed",
  "relatedTransaction",
];

export const createLeaveRequestSchema = createSchema(LeaveRequestModel.schema, {
  exclude: WORKFLOW_FIELDS,
}).keys({
  // department is resolved from the employee if omitted (beforeCreate) —
  // required on the Mongoose schema, but not at the HTTP layer.
  department: objectId().optional(),
  // totalDays is auto-computed from the date range when omitted.
  totalDays: Joi.number().min(0.5).optional(),
});

export const updateLeaveRequestSchema = updateSchema(LeaveRequestModel.schema, {
  exclude: ["updatedBy", "employee", "brand", ...WORKFLOW_FIELDS],
});

export const paramsLeaveRequestSchema = paramsSchema();
export const paramsLeaveRequestIdsSchema = paramsIdsSchema();

export const queryLeaveRequestSchema = querySchema({
  employee: objectId().optional(),
  branch: objectId().optional(),
  department: objectId().optional(),
  leaveType: Joi.string().valid(...LEAVE_TYPES).optional(),
  requestKind: Joi.string().valid("leave", "encashment").optional(),
  status: Joi.string().optional(),
});
