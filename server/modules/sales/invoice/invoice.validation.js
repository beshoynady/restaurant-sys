import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import InvoiceModel from "./invoice.model.js";

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
export const paramsInvoiceSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsInvoiceIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryInvoiceSchema = querySchema();