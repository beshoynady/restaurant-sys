import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import CashTransferModel from "../../models/cash/cash-transfer.model.js";

/* =========================
   Create Schema
========================= */
export const createCashTransferSchema = createSchema(CashTransferModel.schema);

/* =========================
   Update Schema
========================= */
export const updateCashTransferSchema = updateSchema(
  CashTransferModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsCashTransferSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsCashTransferIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryCashTransferSchema = querySchema();