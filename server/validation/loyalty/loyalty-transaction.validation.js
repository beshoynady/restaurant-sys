import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const loyaltyTransactionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const loyaltyTransactionQuerySchema = querySchema();