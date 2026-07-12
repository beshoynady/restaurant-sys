import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import InvoiceModel from "./invoice.model.js";

/* =========================
   Create Schema
========================= */
// DB-007: `serial` is now server-generated (see invoice.service.ts's beforeCreate hook) — excluded
// here so a client-supplied value is silently stripped (stripUnknown: true) rather than accepted
// or rejected, keeping old clients that still send one compatible.
export const createInvoiceSchema = createSchema(InvoiceModel.schema, { exclude: ["serial"] });

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