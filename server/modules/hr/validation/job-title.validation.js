import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import JobTitleModel from "../../models/employees/job-title.model.js";

/* =========================
   Create Schema
========================= */
export const createJobTitleSchema = createSchema(JobTitleModel.schema);

/* =========================
   Update Schema
========================= */
export const updateJobTitleSchema = updateSchema(
  JobTitleModel.schema,
  ["updatedBy"]
);

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
export const queryJobTitleSchema = querySchema();