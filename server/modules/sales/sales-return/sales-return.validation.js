import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import SalesReturnModel from "./sales-return.model.js";

/* =========================
   Create Schema
========================= */
export const createSalesReturnSchema = createSchema(SalesReturnModel.schema);

/* =========================
   Update Schema
========================= */
export const updateSalesReturnSchema = updateSchema(
  SalesReturnModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsSalesReturnSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsSalesReturnIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const querySalesReturnSchema = querySchema();