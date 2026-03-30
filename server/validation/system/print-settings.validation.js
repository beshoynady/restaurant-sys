import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PrintSettingsModel from "../../models/system/print-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPrintSettingsSchema = buildJoiSchema(PrintSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePrintSettingsSchema = (function() {
  const schema = buildJoiSchema(PrintSettingsModel.schema);
  return schema.fork(Object.keys(PrintSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const printSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const printSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});