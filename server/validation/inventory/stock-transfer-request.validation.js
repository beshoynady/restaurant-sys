import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import StockTransferRequestModel from "../../models/inventory/stock-transfer-request.model.js";

/* =========================
   Create Schema
========================= */
export const createStockTransferRequestSchema = createSchema(StockTransferRequestModel.schema);

/* =========================
   Update Schema
========================= */
export const updateStockTransferRequestSchema = updateSchema(
  StockTransferRequestModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const stockTransferRequestParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const stockTransferRequestQuerySchema = querySchema();