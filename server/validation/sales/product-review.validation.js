import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ProductReviewModel from "../../models/sales/product-review.model.js";

/* =========================
   Create Schema
========================= */
export const createProductReviewSchema = buildJoiSchema(ProductReviewModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateProductReviewSchema = (function() {
  const schema = buildJoiSchema(ProductReviewModel.schema);
  return schema.fork(Object.keys(ProductReviewModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const productReviewParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const productReviewQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});