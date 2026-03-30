import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import DiscountSettingsModel from "../../models/system\discount-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createDiscountSettingsSchema = buildJoiSchema(DiscountSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateDiscountSettingsSchema = (function() {
  const schema = buildJoiSchema(DiscountSettingsModel.schema);
  return schema.fork(Object.keys(DiscountSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const discountSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const discountSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});