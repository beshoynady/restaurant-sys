import Joi from "joi";
import {
  objectId,
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";

import LoyaltySettingsModel from "./loyalty-settings.model.js";

/* =========================
   CRUD
========================= */

export const createLoyaltySettingsSchema = createSchema(LoyaltySettingsModel.schema);

export const updateLoyaltySettingsSchema = updateSchema(LoyaltySettingsModel.schema, ["updatedBy"]);

export const paramsLoyaltySettingsSchema = paramsSchema();

export const paramsLoyaltySettingsIdsSchema = paramsIdsSchema();

export const queryLoyaltySettingsSchema = querySchema();

/* =========================
   :brandId routes (not :id)
========================= */

export const paramsBrandIdSchema = Joi.object({
  brandId: objectId().required(),
});

/* =========================
   Business Logic
========================= */

export const calculatePointsSchema = Joi.object({
  brandId: objectId().required(),
  orderAmount: Joi.number().min(1).required(),
});

export const calculateTierSchema = Joi.object({
  brandId: objectId().required(),
  points: Joi.number().min(0).required(),
});

export const calculateRedeemSchema = Joi.object({
  brandId: objectId().required(),
  points: Joi.number().min(1).required(),
  orderAmount: Joi.number().min(1).required(),
});
