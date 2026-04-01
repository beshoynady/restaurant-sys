import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import LoyaltyRewardModel from "../../models/loyalty/loyalty-reward.model.js";

/* =========================
   Create Schema
========================= */
export const createLoyaltyRewardSchema = createSchema(LoyaltyRewardModel.schema);

/* =========================
   Update Schema
========================= */
export const updateLoyaltyRewardSchema = updateSchema(
  LoyaltyRewardModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const loyaltyRewardParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const loyaltyRewardQuerySchema = querySchema();