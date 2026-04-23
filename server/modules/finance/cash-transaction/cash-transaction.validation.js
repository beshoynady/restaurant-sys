import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import CashTransactionModel from "./cash-transaction.model.js";

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
export const paramsCashTransactionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsCashTransactionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryCashTransactionSchema = querySchema();