import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PreparationSectionModel from "../../models/kitchen/preparation-section.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationSectionSchema = buildJoiSchema(PreparationSectionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePreparationSectionSchema = (function() {
  const schema = buildJoiSchema(PreparationSectionModel.schema);
  return schema.fork(Object.keys(PreparationSectionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const preparationSectionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const preparationSectionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});