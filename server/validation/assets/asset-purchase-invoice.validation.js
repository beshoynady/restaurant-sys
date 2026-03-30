import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AssetPurchaseInvoiceModel from "../../models/assets\asset-purchase-invoice.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetPurchaseInvoiceSchema = buildJoiSchema(AssetPurchaseInvoiceModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAssetPurchaseInvoiceSchema = (function() {
  const schema = buildJoiSchema(AssetPurchaseInvoiceModel.schema);
  return schema.fork(Object.keys(AssetPurchaseInvoiceModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const assetPurchaseInvoiceParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const assetPurchaseInvoiceQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});