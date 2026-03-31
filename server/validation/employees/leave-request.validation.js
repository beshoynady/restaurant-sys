import Joi from "joi";
import { objectId, buildJoiSchema, updateJoiSchema } from "../../utils/joiFactory.js";
import LeaveRequestModel from "../../models/employees/leave-request.model.js";

/* =========================
   Create Schema
========================= */
export const createLeaveRequestSchema = buildJoiSchema(LeaveRequestModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateLeaveRequestSchema = updateJoiSchema(LeaveRequestModel.schema);

/* =========================
   Params Schema
========================= */
export const leaveRequestParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const leaveRequestQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});