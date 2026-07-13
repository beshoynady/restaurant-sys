import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import DepartmentModel from "./department.model.js";
import Joi from "joi";

/* =========================
   Create Schema
========================= */
export const createDepartmentSchema = createSchema(DepartmentModel.schema);

/* =========================
   Update Schema
========================= */
// Previously passed as a bare array (`["updatedBy"]`) instead of
// `{exclude: [...]}` — silently a no-op due to how the options object is
// spread in joiFactory.updateSchema (harmless here since `updatedBy` is
// already excluded by joiFactory's own default list, but corrected for
// clarity — same fix already applied across the Organization domain).
export const updateDepartmentSchema = updateSchema(DepartmentModel.schema, { exclude: ["updatedBy"] });

/* =========================
   Params Schema
========================= */
export const paramsDepartmentSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsDepartmentIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryDepartmentSchema = querySchema({
  classification: Joi.string()
    .valid(...DepartmentModel.schema.path("classification").options.enum)
    .optional(),
  parentDepartment: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
