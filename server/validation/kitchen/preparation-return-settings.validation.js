import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PreparationReturnSettingsModel from "../../models/kitchen/preparation-return-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationReturnSettingsSchema = buildJoiSchema(PreparationReturnSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePreparationReturnSettingsSchema = (function() {
  const schema = buildJoiSchema(PreparationReturnSettingsModel.schema);
  return schema.fork(Object.keys(PreparationReturnSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const preparationReturnSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const preparationReturnSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});