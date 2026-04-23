import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import DiscountSettingsModel from "./discount-settings.model.js";

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
export const paramsDiscountSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsDiscountSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryDiscountSettingsSchema = querySchema();