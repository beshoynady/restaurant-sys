import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PurchaseInvoiceModel from "../../models/purchasing/purchase-invoice.model.js";

/* =========================
   Create Schema
========================= */
export const createPurchaseInvoiceSchema = createSchema(PurchaseInvoiceModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePurchaseInvoiceSchema = updateSchema(
  PurchaseInvoiceModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const purchaseInvoiceParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const purchaseInvoiceQuerySchema = querySchema();