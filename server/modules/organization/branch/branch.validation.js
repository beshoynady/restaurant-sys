import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema } from "../../../utils/joiFactory.js";
import BranchModel from "./branch.model.js";

export const createBranchSchema = createSchema(BranchModel.schema);

// `updatedBy` is already excluded by joiFactory's own default exclusion
// list — the exclude option here was previously passed as a bare array
// (`["updatedBy"]`) instead of `{exclude: [...]}`, which is silently a
// no-op due to how the options object is spread. Harmless in practice
// (updatedBy was excluded by default either way) but corrected for clarity.
export const updateBranchSchema = updateSchema(BranchModel.schema, { exclude: ["updatedBy"] });

export const paramsBranchSchema = paramsSchema();
export const paramsBranchIdsSchema = paramsIdsSchema();

// Full frontend filtering surface (list/table screen) — kept as an explicit
// schema rather than the generic querySchema() factory output, since Branch
// supports geo (`lat`/`lng`/`maxDistance`) and field filters (`city`,
// `country`, `isMainBranch`) that the generic factory doesn't know about.
export const queryBranchSchema = Joi.object({
  page: Joi.number().default(1),
  limit: Joi.number().default(10),

  search: Joi.string().allow(""),

  status: Joi.string().valid("active", "inactive", "under_maintenance"),

  isMainBranch: Joi.boolean(),

  city: Joi.string(),
  country: Joi.string(),

  lat: Joi.number(),
  lng: Joi.number(),
  maxDistance: Joi.number().default(5000),

  sortBy: Joi.string().default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
