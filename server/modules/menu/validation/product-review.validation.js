import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import ProductReviewModel from "../../models/sales/product-review.model.js";

/* =========================
   Create Schema
========================= */
export const createProductReviewSchema = createSchema(ProductReviewModel.schema);

/* =========================
   Update Schema
========================= */
export const updateProductReviewSchema = updateSchema(
  ProductReviewModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsProductReviewSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsProductReviewIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryProductReviewSchema = querySchema();