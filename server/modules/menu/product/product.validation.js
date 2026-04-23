import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import ProductModel from "./product.model.js";

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
export const paramsProductSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsProductIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryProductSchema = querySchema();