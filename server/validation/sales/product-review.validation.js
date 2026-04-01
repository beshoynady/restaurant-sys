import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const productReviewParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const productReviewQuerySchema = querySchema();