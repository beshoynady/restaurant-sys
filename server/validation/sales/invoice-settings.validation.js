import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import InvoiceSettingsModel from "../../models/sales/invoice-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createInvoiceSettingsSchema = buildJoiSchema(InvoiceSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateInvoiceSettingsSchema = (function() {
  const schema = buildJoiSchema(InvoiceSettingsModel.schema);
  return schema.fork(Object.keys(InvoiceSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const invoiceSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const invoiceSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});