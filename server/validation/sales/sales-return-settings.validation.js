import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import SalesReturnSettingsModel from "../../models/sales/sales-return-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createSalesReturnSettingsSchema = buildJoiSchema(SalesReturnSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateSalesReturnSettingsSchema = (function() {
  const schema = buildJoiSchema(SalesReturnSettingsModel.schema);
  return schema.fork(Object.keys(SalesReturnSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const salesReturnSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const salesReturnSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});