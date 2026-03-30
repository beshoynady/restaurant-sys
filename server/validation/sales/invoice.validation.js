import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import InvoiceModel from "../../models/sales\invoice.model.js";

/* =========================
   Create Schema
========================= */
export const createInvoiceSchema = buildJoiSchema(InvoiceModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateInvoiceSchema = (function() {
  const schema = buildJoiSchema(InvoiceModel.schema);
  return schema.fork(Object.keys(InvoiceModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const invoiceParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const invoiceQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});