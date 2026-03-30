import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PurchaseInvoiceModel from "../../models/purchasing/purchase-invoice.model.js";

/* =========================
   Create Schema
========================= */
export const createPurchaseInvoiceSchema = buildJoiSchema(PurchaseInvoiceModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePurchaseInvoiceSchema = (function() {
  const schema = buildJoiSchema(PurchaseInvoiceModel.schema);
  return schema.fork(Object.keys(PurchaseInvoiceModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const purchaseInvoiceParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const purchaseInvoiceQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});