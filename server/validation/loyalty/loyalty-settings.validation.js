import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import LoyaltySettingsModel from "../../models/loyalty/loyalty-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createLoyaltySettingsSchema = createSchema(LoyaltySettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateLoyaltySettingsSchema = updateSchema(
  LoyaltySettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsLoyaltySettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsLoyaltySettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryLoyaltySettingsSchema = querySchema();