import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import JobTitleModel from "./job-title.model.js";

/* =========================
   Create Schema
========================= */
export const createJobTitleSchema = createSchema(JobTitleModel.schema);

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array instead of `{exclude:[...]}` — silently
// a no-op (harmless, `updatedBy` is already excluded by joiFactory's own
// default list) but corrected for clarity — same fix already applied
// across the Organization domain and Department.
export const updateJobTitleSchema = updateSchema(JobTitleModel.schema, { exclude: ["updatedBy"] });

/* =========================
   Params Schema
========================= */
export const paramsJobTitleSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsJobTitleIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
// Previously had zero extra filters allow-listed — since querySchema() is
// strict (unknown(false)), `?status=active&department=...` was rejected
// outright.
export const queryJobTitleSchema = querySchema({
  department: Joi.string().optional(),
  branch: Joi.string().optional(),
  status: Joi.string()
    .valid(...JobTitleModel.schema.path("status").options.enum)
    .optional(),
});
