import Joi from "joi";
import {
  objectId,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../utils/joiFactory.js";

import LoyaltyRewardModel from "../../models/loyalty/loyalty-reward.model.js";

/* =========================
   🔹 Create Schema
========================= */
export const createLoyaltyRewardSchema = {
  body: Joi.object({
    brand: objectId().required(),
    branch: objectId(true),

    name: Joi.object()
      .pattern(Joi.string().length(2), Joi.string().min(1).max(100))
      .required(),

    description: Joi.object()
      .pattern(Joi.string().length(2), Joi.string().min(1).max(500))
      .required(),

    pointsRequired: Joi.number().min(1).required(),

    rewardType: Joi.string()
      .valid("discount", "product", "gift")
      .required(),

    product: objectId(true),
    discountAmount: Joi.number().min(0),

    maxRedemptionsPerCustomer: Joi.number().min(1),
    maxTotalRedemptions: Joi.number().min(1),

    startDate: Joi.date(),
    endDate: Joi.date(),

    isActive: Joi.boolean(),

    createdBy: objectId().required(),
  })
    /* 🔥 Conditional logic */
    .when(Joi.object({ rewardType: Joi.valid("product") }).unknown(), {
      then: Joi.object({
        product: objectId().required(),
      }),
    })
    .when(Joi.object({ rewardType: Joi.valid("discount") }).unknown(), {
      then: Joi.object({
        discountAmount: Joi.number().min(1).required(),
      }),
    })
    /* 🔥 Date validation */
    .custom((value, helpers) => {
      if (value.startDate && value.endDate) {
        if (value.endDate < value.startDate) {
          return helpers.message("endDate must be after startDate");
        }
      }
      return value;
    }),
};

/* =========================
   🔹 Update Schema
========================= */
export const updateLoyaltyRewardSchema = {
  body: Joi.object({
    id: objectId().required(),

    name: Joi.object().pattern(
      Joi.string().length(2),
      Joi.string().min(1).max(100)
    ),

    description: Joi.object().pattern(
      Joi.string().length(2),
      Joi.string().min(1).max(500)
    ),

    pointsRequired: Joi.number().min(1),

    rewardType: Joi.string().valid("discount", "product", "gift"),

    product: objectId(true),
    discountAmount: Joi.number().min(0),

    maxRedemptionsPerCustomer: Joi.number().min(1),
    maxTotalRedemptions: Joi.number().min(1),

    startDate: Joi.date(),
    endDate: Joi.date(),

    isActive: Joi.boolean(),

    updatedBy: objectId().required(),
  })
    .min(1)
    .custom((value, helpers) => {
      if (value.startDate && value.endDate) {
        if (value.endDate < value.startDate) {
          return helpers.message("endDate must be after startDate");
        }
      }
      return value;
    }),
};

/* =========================
   🔹 Params
========================= */
export const paramsLoyaltyRewardSchema = {
  params: paramsSchema(),
};

export const paramsLoyaltyRewardIdsSchema = {
  body: paramsIdsSchema(),
};

/* =========================
   🔹 Query
========================= */
export const queryLoyaltyRewardSchema = {
  query: querySchema(),
};