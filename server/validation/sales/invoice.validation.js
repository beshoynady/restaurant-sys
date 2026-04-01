import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import InvoiceModel from "../../models/sales/invoice.model.js";

/* =========================
   Create Schema
========================= */
export const createInvoiceSchema = createSchema(InvoiceModel.schema);

/* =========================
   Update Schema
========================= */
export const updateInvoiceSchema = updateSchema(
  InvoiceModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const invoiceParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const invoiceQuerySchema = querySchema();