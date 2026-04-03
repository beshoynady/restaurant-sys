import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import PayrollItemModel from "../../models/employees/payroll-item.model.js";

/* =========================
   Create Schema
========================= */
export const createPayrollItemSchema = createSchema(PayrollItemModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePayrollItemSchema = updateSchema(
  PayrollItemModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPayrollItemSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPayrollItemIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPayrollItemSchema = querySchema();