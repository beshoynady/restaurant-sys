import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import InvoiceSettingsModel from "../../models/sales/invoice-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createInvoiceSettingsSchema = createSchema(InvoiceSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateInvoiceSettingsSchema = updateSchema(
  InvoiceSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const invoiceSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const invoiceSettingsQuerySchema = querySchema();