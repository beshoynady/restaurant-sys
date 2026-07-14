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

export const transitionPurchaseInvoiceSchema = Joi.object({
  status: Joi.string().valid("Draft", "Review", "Approved", "Completed", "Rejected", "Cancelled").required(),
});

export const recordPurchaseInvoicePaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: objectId().required(),
  cashRegister: objectId(true).optional(),
  reference: Joi.string().trim().max(200).optional(),
});