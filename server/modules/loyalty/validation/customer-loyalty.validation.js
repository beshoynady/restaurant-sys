import Joi from "joi";
import {
  objectId,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../utils/joiFactory.js";

import CustomerLoyaltyModel from "../../models/loyalty/customer-loyalty.model.js";

/* =========================
   🔹 SAFE CREATE
   Only allow system fields
========================= */
export const createCustomerLoyaltySchema = {
  body: Joi.object({
    brand: objectId().required(),
    phone: Joi.string().trim().max(30).required(),
    createdBy: objectId().required(),
  }),
};

/* =========================
   🔹 SAFE UPDATE
   Prevent wallet manipulation
========================= */
export const updateCustomerLoyaltySchema = {
  body: Joi.object({
    updatedBy: objectId().required(),
  }),
};

/* =========================
   🔹 Params
========================= */
export const paramsCustomerLoyaltySchema = {
  params: paramsSchema(),
};

export const paramsCustomerLoyaltyIdsSchema = {
  body: paramsIdsSchema(),
};

/* =========================
   🔹 Query
========================= */
export const queryCustomerLoyaltySchema = {
  query: querySchema(),
};
