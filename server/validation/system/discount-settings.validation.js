import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import DiscountSettingsModel from "../../models/system/discount-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createDiscountSettingsSchema = createSchema(DiscountSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateDiscountSettingsSchema = updateSchema(
  DiscountSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const discountSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const discountSettingsQuerySchema = querySchema();