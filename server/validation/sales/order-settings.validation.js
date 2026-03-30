import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import OrderSettingsModel from "../../models/sales/order-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createOrderSettingsSchema = buildJoiSchema(OrderSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateOrderSettingsSchema = (function() {
  const schema = buildJoiSchema(OrderSettingsModel.schema);
  return schema.fork(Object.keys(OrderSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const orderSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const orderSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});