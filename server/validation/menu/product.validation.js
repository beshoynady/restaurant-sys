import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import ProductModel from "../../models/menu/product.model.js";

/* =========================
   Create Schema
========================= */
export const createProductSchema = createSchema(ProductModel.schema);

/* =========================
   Update Schema
========================= */
export const updateProductSchema = updateSchema(
  ProductModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const productParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const productQuerySchema = querySchema();