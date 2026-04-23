import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import StockCategoryModel from "./stock-category.model.js";

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
export const paramsStockCategorySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsStockCategoryIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryStockCategorySchema = querySchema();