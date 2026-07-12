import Joi from "joi";
import BrandModel from "./brand.model.js";
import { SUPPORTED_LANGUAGES } from "../../../utils/languages.js";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  querySchema,
  bulkIdsSchema,
} from "../../../utils/joiFactory.js";

/* ---------------- CREATE ---------------- */
export const createBrandSchema = createSchema(BrandModel.schema, {
  exclude: ["isDeleted", "deletedAt", "deletedBy", "updatedBy"],
});

/* ---------------- UPDATE ---------------- */
export const updateBrandSchema = updateSchema(BrandModel.schema, {
  exclude: ["slug", "createdBy", "isDeleted", "deletedAt", "deletedBy"],
});

/* ---------------- PARAMS ---------------- */
export const paramsBrandSchema = paramsSchema();

/* ---------------- QUERY ---------------- */
export const queryBrandSchema = querySchema();

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
// Sourced from utils/languages.js so this can never drift from the
// model's own enum.
export const updateBrandSettingsSchema = Joi.object({
  currency: Joi.string().valid("USD", "EUR", "GBP", "EGP", "SAR", "AED"),
  timezone: Joi.string(),
  countryCode: Joi.string().length(2).uppercase(),

  defaultDashboardLanguage: Joi.string().valid(...SUPPORTED_LANGUAGES),
  dashboardLanguages: Joi.array().items(Joi.string().valid(...SUPPORTED_LANGUAGES)),
});

/* ---------------- SETUP ---------------- */
export const setupProgressSchema = Joi.object({
  step: Joi.number().min(0).max(10).required(),
});
