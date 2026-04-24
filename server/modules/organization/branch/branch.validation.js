import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import BranchModel from "./branch.model.js";

/* =========================
   CREATE
========================= */
export const createBranchSchema = createSchema(BranchModel.schema);

/* =========================
   UPDATE
========================= */
export const updateBranchSchema = updateSchema(
  BranchModel.schema,
  ["updatedBy"]
);

/* =========================
   PARAMS
========================= */
export const paramsBranchSchema = paramsSchema();
export const paramsBranchIdsSchema = paramsIdsSchema();

/* =========================
   QUERY (FULL FRONTEND FILTERING)
========================= */
export const queryBranchSchema = Joi.object({
  page: Joi.number().default(1),
  limit: Joi.number().default(10),

  search: Joi.string().allow(""),

  status: Joi.string().valid("active", "inactive", "under_maintenance"),

  isMainBranch: Joi.boolean(),

  city: Joi.string(),
  country: Joi.string(),

  // 🔥 GEO FILTER (Google Maps)
  lat: Joi.number(),
  lng: Joi.number(),
  maxDistance: Joi.number().default(5000),

  sortBy: Joi.string().default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});