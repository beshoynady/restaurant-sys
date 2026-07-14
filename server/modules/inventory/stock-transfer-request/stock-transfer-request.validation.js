import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import StockTransferRequestModel from "./stock-transfer-request.model.js";

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

export const transitionStockTransferRequestSchema = Joi.object({
  status: Joi.string().valid("Draft", "Submitted", "Approved", "Rejected", "Canceled", "Executed").required(),
  rejectionReason: Joi.string().trim().max(300).optional(),
});