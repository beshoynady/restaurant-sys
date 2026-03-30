import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ProductModel from "../../models/menu/product.model.js";

/* =========================
   Create Schema
========================= */
export const createProductSchema = buildJoiSchema(ProductModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateProductSchema = (function() {
  const schema = buildJoiSchema(ProductModel.schema);
  return schema.fork(Object.keys(ProductModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const productParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const productQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});