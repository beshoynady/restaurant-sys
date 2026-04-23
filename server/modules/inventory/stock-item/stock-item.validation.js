import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import StockItemModel from "./stock-item.model.js";

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
export const paramsStockItemSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsStockItemIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryStockItemSchema = querySchema();