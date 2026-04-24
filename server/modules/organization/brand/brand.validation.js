import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import BrandModel from "./brand.model.js";

/* =========================
   CREATE BRAND
========================= */
export const createBrandSchema = createSchema(BrandModel.schema);

/* =========================
   UPDATE BRAND
========================= */
export const updateBrandSchema = updateSchema(
  BrandModel.schema,
  ["updatedBy"]
);

/* =========================
   PARAMS
========================= */
export const paramsBrandSchema = paramsSchema();

/* =========================
   QUERY (SEARCH / LIST)
========================= */
export const queryBrandSchema = querySchema();

/* =========================
   STATUS CHANGE
========================= */
export const changeStatusSchema = Joi.object({
  status: Joi.string()
    .valid("active", "inactive", "suspended")
    .required(),
});

/* =========================
   UPDATE LOGO
========================= */
export const updateLogoSchema = Joi.object({
  logo: Joi.string().uri().allow(null, ""),
});

/* =========================
   UPDATE SETTINGS
========================= */
export const updateBrandSettingsSchema = Joi.object({
  currency: Joi.object({
    code: Joi.string().valid(
      "USD",
      "EUR",
      "GBP",
      "EGP",
      "SAR",
      "AED",
      "JPY",
      "CNY"
    ),
    symbol: Joi.string().max(5),
    decimalPlaces: Joi.number().min(0).max(4),
  }),

  timezone: Joi.string(),
  countryCode: Joi.string().length(2).uppercase(),

  defaultDashboardLanguage: Joi.string().valid(
    "EN",
    "AR",
    "FR",
    "ES",
    "IT",
    "ZH",
    "JA",
    "RU"
  ),

  dashboardLanguages: Joi.array().items(
    Joi.string().valid(
      "EN",
      "AR",
      "FR",
      "ES",
      "IT",
      "ZH",
      "JA",
      "RU"
    )
  ),
});

/* =========================
   SETUP PROGRESS
========================= */
export const setupProgressSchema = Joi.object({
  step: Joi.number().min(0).max(10).required(),
});