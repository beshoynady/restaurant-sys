import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import LeaveRequestModel from "./leave-request.model.js";

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
export const paramsLeaveRequestSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsLeaveRequestIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryLeaveRequestSchema = querySchema();