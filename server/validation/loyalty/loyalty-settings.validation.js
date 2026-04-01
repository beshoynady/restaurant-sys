import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const loyaltySettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const loyaltySettingsQuerySchema = querySchema();