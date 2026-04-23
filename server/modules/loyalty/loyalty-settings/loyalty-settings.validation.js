import Joi from "joi";
import {
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

export const createLoyaltySettingsSchema = {
  body: createSchema(LoyaltySettingsModel.schema),
};

export const updateLoyaltySettingsSchema = {
  body: updateSchema(LoyaltySettingsModel.schema, ["updatedBy"]),
};

export const paramsLoyaltySettingsSchema = {
  params: paramsSchema(),
};

export const paramsLoyaltySettingsIdsSchema = {
  body: paramsIdsSchema(),
};

export const queryLoyaltySettingsSchema = {
  query: querySchema(),
};

/* =========================
   Business Logic
========================= */

export const calculatePointsSchema = {
  body: Joi.object({
    orderAmount: Joi.number().min(1).required(),
  }),
};

export const calculateTierSchema = {
  body: Joi.object({
    points: Joi.number().min(0).required(),
  }),
};

export const calculateRedeemSchema = {
  body: Joi.object({
    points: Joi.number().min(1).required(),
  }),
};