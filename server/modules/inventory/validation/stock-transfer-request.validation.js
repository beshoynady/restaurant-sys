import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsStockTransferRequestSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsStockTransferRequestIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryStockTransferRequestSchema = querySchema();