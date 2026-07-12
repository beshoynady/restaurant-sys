import Joi, { ObjectSchema } from "joi";
import joiFactoryJs from "../../../utils/joiFactory.js";
import BrandModel from "./brand.model.js";
import { SUPPORTED_LANGUAGES } from "../../../utils/languages.js";

const { createSchema, updateSchema, paramsSchema, querySchema, bulkIdsSchema } = joiFactoryJs as {
  createSchema: (schema: unknown, options?: { exclude?: string[] }) => ObjectSchema;
  updateSchema: (schema: unknown, options?: { exclude?: string[] }) => ObjectSchema;
  paramsSchema: () => ObjectSchema;
  querySchema: () => ObjectSchema;
  bulkIdsSchema: () => ObjectSchema;
};

/* ---------------- CREATE ---------------- */
export const createBrandSchema: ObjectSchema = createSchema(BrandModel.schema, {
  exclude: ["isDeleted", "deletedAt", "deletedBy", "updatedBy"],
});

/* ---------------- UPDATE ---------------- */
export const updateBrandSchema: ObjectSchema = updateSchema(BrandModel.schema, {
  exclude: ["slug", "createdBy", "isDeleted", "deletedAt", "deletedBy"],
});

/* ---------------- PARAMS ---------------- */
export const paramsBrandSchema: ObjectSchema = paramsSchema();

/* ---------------- QUERY ---------------- */
export const queryBrandSchema: ObjectSchema = querySchema();

/* ---------------- BULK IDS ---------------- */
export const paramsIdsSchema: ObjectSchema = bulkIdsSchema();

/* ---------------- STATUS ---------------- */
export const changeStatusSchema: ObjectSchema = Joi.object({
  status: Joi.string().valid("active", "inactive", "suspended").required(),
});

/* ---------------- LOGO ---------------- */
export const updateLogoSchema: ObjectSchema = Joi.object({
  logo: Joi.string().uri().allow(null, ""),
});

/* ---------------- SETTINGS ---------------- */
export const updateBrandSettingsSchema: ObjectSchema = Joi.object({
  currency: Joi.string().valid("USD", "EUR", "GBP", "EGP", "SAR", "AED"),
  timezone: Joi.string(),
  countryCode: Joi.string().length(2).uppercase(),

  // Sourced from utils/languages.js so this can never drift from the
  // model's own enum (see the Organization module review, this session).
  defaultDashboardLanguage: Joi.string().valid(...SUPPORTED_LANGUAGES),
  dashboardLanguages: Joi.array().items(Joi.string().valid(...SUPPORTED_LANGUAGES)),
});

/* ---------------- SETUP ---------------- */
export const setupProgressSchema: ObjectSchema = Joi.object({
  step: Joi.number().min(0).max(10).required(),
});
