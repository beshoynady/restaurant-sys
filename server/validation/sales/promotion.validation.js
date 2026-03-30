import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PromotionModel from "../../models/sales\promotion.model.js";

/* =========================
   Create Schema
========================= */
export const createPromotionSchema = buildJoiSchema(PromotionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePromotionSchema = (function() {
  const schema = buildJoiSchema(PromotionModel.schema);
  return schema.fork(Object.keys(PromotionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const promotionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const promotionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});