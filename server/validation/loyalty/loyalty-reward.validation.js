import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsLoyaltyRewardSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsLoyaltyRewardIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryLoyaltyRewardSchema = querySchema();