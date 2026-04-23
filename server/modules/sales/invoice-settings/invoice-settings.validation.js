import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import InvoiceSettingsModel from "./invoice-settings.model.js";

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
export const paramsInvoiceSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsInvoiceSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryInvoiceSettingsSchema = querySchema();