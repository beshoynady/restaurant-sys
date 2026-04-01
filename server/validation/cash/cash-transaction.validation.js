import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import CashTransactionModel from "../../models/cash/cash-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createCashTransactionSchema = createSchema(CashTransactionModel.schema);

/* =========================
   Update Schema
========================= */
export const updateCashTransactionSchema = updateSchema(
  CashTransactionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const cashTransactionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const cashTransactionQuerySchema = querySchema();