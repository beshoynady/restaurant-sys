import Joi from "joi";
import BrandModel from "./brand.model.js";
import { SUPPORTED_LANGUAGES } from "../../../utils/languages.js";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  querySchema,
  bulkIdsSchema,
  objectId,
} from "../../../utils/joiFactory.js";

// Sourced directly from the model's own enum so this can never drift from it
// (a previous version of this file hardcoded a 6-currency subset here while
// the model enum carried 16 — any brand on a currency outside that subset
// couldn't update its own settings even though the value was already valid).
const CURRENCY_ENUM = BrandModel.schema.path("currency").options.enum;

/* ---------------- CREATE ---------------- */
export const createBrandSchema = createSchema(BrandModel.schema, {
  exclude: ["isDeleted", "deletedAt", "deletedBy", "updatedBy"],
});

/* ---------------- UPDATE ---------------- */
// `owner` excluded: ownership transfer is a distinct, security-sensitive
// action (see transferOwnershipSchema below), not a generic field edit —
// it must validate the new owner belongs to this brand before writing.
export const updateBrandSchema = updateSchema(BrandModel.schema, {
  exclude: ["slug", "owner", "createdBy", "isDeleted", "deletedAt", "deletedBy"],
});

/* ---------------- PARAMS ---------------- */
export const paramsBrandSchema = paramsSchema();

/* ---------------- QUERY ---------------- */
// The base querySchema() is unknown(false) — any filter beyond
// page/limit/search/sort/select/includeDeleted would 400 before reaching
// the controller, even though BaseController.getAll happily forwards
// arbitrary req.query filters to the repository. Brand's two realistic
// list filters (platform admin screens filtering by lifecycle/business
// type) are declared explicitly here for that reason.
export const queryBrandSchema = querySchema({
  status: Joi.string().valid(...BrandModel.schema.path("status").options.enum),
  businessType: Joi.string().valid(...BrandModel.schema.path("businessType").options.enum),
});

/* ---------------- BULK IDS ---------------- */
export const paramsIdsSchema = bulkIdsSchema();

/* ---------------- STATUS ---------------- */
export const changeStatusSchema = Joi.object({
  status: Joi.string().valid("active", "inactive", "suspended").required(),
});

/* ---------------- LOGO ---------------- */
export const updateLogoSchema = Joi.object({
  logo: Joi.string().uri().allow(null, ""),
});

/* ---------------- SETTINGS ---------------- */
// Sourced from utils/languages.js / the model's own currency enum so this
// can never drift from either.
export const updateBrandSettingsSchema = Joi.object({
  currency: Joi.string().valid(...CURRENCY_ENUM),
  timezone: Joi.string(),
  countryCode: Joi.string().length(2).uppercase(),

  defaultDashboardLanguage: Joi.string().valid(...SUPPORTED_LANGUAGES),
  dashboardLanguages: Joi.array().items(Joi.string().valid(...SUPPORTED_LANGUAGES)),
});

/* ---------------- SETUP ---------------- */
export const setupProgressSchema = Joi.object({
  step: Joi.number().min(0).max(10).required(),
});

/* ---------------- OWNERSHIP TRANSFER ---------------- */
export const transferOwnershipSchema = Joi.object({
  owner: objectId().required(),
});
