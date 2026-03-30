import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import BrandModel from "../../models/core/brand.model.js";

/* =========================
   Create Schema
========================= */
export const createBrandSchema = buildJoiSchema(BrandModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateBrandSchema = (function() {
  const schema = buildJoiSchema(BrandModel.schema);
  return schema.fork(Object.keys(BrandModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const brandParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const brandQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});