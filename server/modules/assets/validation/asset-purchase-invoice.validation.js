import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import AssetPurchaseInvoiceModel from "../../models/assets/asset-purchase-invoice.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetPurchaseInvoiceSchema = createSchema(AssetPurchaseInvoiceModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAssetPurchaseInvoiceSchema = updateSchema(
  AssetPurchaseInvoiceModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsAssetPurchaseInvoiceSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAssetPurchaseInvoiceIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAssetPurchaseInvoiceSchema = querySchema();