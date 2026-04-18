import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsPromotionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPromotionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPromotionSchema = querySchema();