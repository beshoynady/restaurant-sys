import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ShiftSettingsModel from "../../models/system/shift-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createShiftSettingsSchema = buildJoiSchema(ShiftSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateShiftSettingsSchema = (function() {
  const schema = buildJoiSchema(ShiftSettingsModel.schema);
  return schema.fork(Object.keys(ShiftSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const shiftSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const shiftSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});