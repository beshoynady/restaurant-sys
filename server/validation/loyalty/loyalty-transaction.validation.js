import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import LoyaltyTransactionModel from "../../models/loyalty/loyalty-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createLoyaltyTransactionSchema = createSchema(LoyaltyTransactionModel.schema);

/* =========================
   Update Schema
========================= */
export const updateLoyaltyTransactionSchema = updateSchema(
  LoyaltyTransactionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsLoyaltyTransactionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsLoyaltyTransactionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryLoyaltyTransactionSchema = querySchema();