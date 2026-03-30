import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PreparationReturnModel from "../../models/kitchen/preparation-return.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationReturnSchema = buildJoiSchema(PreparationReturnModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePreparationReturnSchema = (function() {
  const schema = buildJoiSchema(PreparationReturnModel.schema);
  return schema.fork(Object.keys(PreparationReturnModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const preparationReturnParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const preparationReturnQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});