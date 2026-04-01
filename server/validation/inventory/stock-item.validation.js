import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import StockItemModel from "../../models/inventory/stock-item.model.js";

/* =========================
   Create Schema
========================= */
export const createStockItemSchema = createSchema(StockItemModel.schema);

/* =========================
   Update Schema
========================= */
export const updateStockItemSchema = updateSchema(
  StockItemModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const stockItemParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const stockItemQuerySchema = querySchema();