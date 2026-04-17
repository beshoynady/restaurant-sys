import Joi from "joi";
import {
  objectId,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../utils/joiFactory.js";

/* =========================
   🔹 Params
========================= */
export const paramsLoyaltyTransactionSchema = {
  params: paramsSchema(),
};

export const paramsLoyaltyTransactionIdsSchema = {
  body: paramsIdsSchema(),
};

/* =========================
   🔹 Query
========================= */
export const queryLoyaltyTransactionSchema = {
  query: querySchema(),
};