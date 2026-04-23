import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import PurchaseInvoiceModel from "./purchase-invoice.model.js";

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
export const paramsPurchaseInvoiceSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPurchaseInvoiceIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPurchaseInvoiceSchema = querySchema();