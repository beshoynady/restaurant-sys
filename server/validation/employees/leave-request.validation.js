import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import LeaveRequestModel from "../../models/employees/leave-request.model.js";

/* =========================
   Create Schema
========================= */
export const createLeaveRequestSchema = createSchema(LeaveRequestModel.schema);

/* =========================
   Update Schema
========================= */
export const updateLeaveRequestSchema = updateSchema(
  LeaveRequestModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const leaveRequestParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const leaveRequestQuerySchema = querySchema();