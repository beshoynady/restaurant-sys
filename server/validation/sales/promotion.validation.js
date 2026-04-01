import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PromotionModel from "../../models/sales/promotion.model.js";

/* =========================
   Create Schema
========================= */
export const createPromotionSchema = createSchema(PromotionModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePromotionSchema = updateSchema(
  PromotionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const promotionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const promotionQuerySchema = querySchema();