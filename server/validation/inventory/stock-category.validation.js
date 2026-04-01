import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import StockCategoryModel from "../../models/inventory/stock-category.model.js";

/* =========================
   Create Schema
========================= */
export const createStockCategorySchema = createSchema(StockCategoryModel.schema);

/* =========================
   Update Schema
========================= */
export const updateStockCategorySchema = updateSchema(
  StockCategoryModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const stockCategoryParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const stockCategoryQuerySchema = querySchema();