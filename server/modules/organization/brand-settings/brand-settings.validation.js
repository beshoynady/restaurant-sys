// modules/organization/brand-settings/brand-settings.validation.js

import Joi from "joi";
import BrandSettingsModel from "./brand-settings.model.js";

import {
  createSchema,
  updateSchema,
  paramsSchema,
  querySchema,
  paramsIdsSchema,
} from "../../../utils/joiFactory.js";

/* ================= CREATE ================= */
// Nested objects (seo/socialMedia/modules/security) validate correctly via
// utils/joiFactory.js's nested-object reassembly.
export const createBrandSettingsSchema = createSchema(BrandSettingsModel.schema, {
  exclude: ["isDeleted", "deletedAt", "deletedBy"],
});

/* ================= UPDATE ================= */
export const updateBrandSettingsSchema = updateSchema(BrandSettingsModel.schema, {
  exclude: ["brand", "createdBy"],
});

/* ================= PARAMS ================= */
export const paramsBrandSettingsSchema = paramsSchema();

/* ================= QUERY ================= */
export const queryBrandSettingsSchema = querySchema();

/* ================= BULK IDS ================= */
export const paramsIdsBrandSettingsSchema = paramsIdsSchema();

/* ================= TOGGLE MODULE ================= */
export const toggleModuleSchema = Joi.object({
  module: Joi.string().required(),
  enabled: Joi.boolean().required(),
});

/* ================= SECURITY ================= */
export const securitySchema = Joi.object({
  allowMultipleSessions: Joi.boolean(),
  sessionTimeoutMinutes: Joi.number().min(15).max(1440),
});

/* ================= SEO ================= */
export const seoSchema = Joi.object({
  ogImageUrl: Joi.string().uri().allow(null, ""),
});
