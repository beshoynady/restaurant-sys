import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const cashTransferParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const cashTransferQuerySchema = querySchema();