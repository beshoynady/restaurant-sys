import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import MenuSettingsModel from "../../models/menu/menu-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createMenuSettingsSchema = buildJoiSchema(MenuSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateMenuSettingsSchema = (function() {
  const schema = buildJoiSchema(MenuSettingsModel.schema);
  return schema.fork(Object.keys(MenuSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const menuSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const menuSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});