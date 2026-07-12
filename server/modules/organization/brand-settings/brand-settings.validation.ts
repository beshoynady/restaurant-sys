import Joi, { ObjectSchema } from "joi";
import joiFactoryJs from "../../../utils/joiFactory.js";
import BrandSettingsModel from "./brand-settings.model.js";

const { createSchema, updateSchema, paramsSchema, querySchema, paramsIdsSchema } =
  joiFactoryJs as {
    createSchema: (schema: unknown, options?: { exclude?: string[] }) => ObjectSchema;
    updateSchema: (schema: unknown, options?: { exclude?: string[] }) => ObjectSchema;
    paramsSchema: () => ObjectSchema;
    querySchema: () => ObjectSchema;
    paramsIdsSchema: () => ObjectSchema;
  };

/* ================= CREATE ================= */
// Nested objects (seo/socialMedia/modules/security) now validate correctly —
// see utils/joiFactory.js's nested-object reassembly fix (this session).
export const createBrandSettingsSchema: ObjectSchema = createSchema(BrandSettingsModel.schema, {
  exclude: ["isDeleted", "deletedAt", "deletedBy"],
});

/* ================= UPDATE ================= */
export const updateBrandSettingsSchema: ObjectSchema = updateSchema(BrandSettingsModel.schema, {
  exclude: ["brand", "createdBy"],
});

/* ================= PARAMS ================= */
export const paramsBrandSettingsSchema: ObjectSchema = paramsSchema();

/* ================= QUERY ================= */
export const queryBrandSettingsSchema: ObjectSchema = querySchema();

/* ================= BULK IDS ================= */
export const paramsIdsBrandSettingsSchema: ObjectSchema = paramsIdsSchema();

/* ================= TOGGLE MODULE ================= */
export const toggleModuleSchema: ObjectSchema = Joi.object({
  module: Joi.string().required(),
  enabled: Joi.boolean().required(),
});

/* ================= SECURITY ================= */
export const securitySchema: ObjectSchema = Joi.object({
  allowMultipleSessions: Joi.boolean(),
  sessionTimeoutMinutes: Joi.number().min(15).max(1440),
});

/* ================= SEO ================= */
export const seoSchema: ObjectSchema = Joi.object({
  ogImageUrl: Joi.string().uri().allow(null, ""),
});
