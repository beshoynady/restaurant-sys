import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import SalesReturnModel from "../../models/sales/sales-return.model.js";

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
export const salesReturnParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const salesReturnQuerySchema = querySchema();