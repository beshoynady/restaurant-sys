import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import PayrollModel from "../../models/employees/payroll.model.js";

/* =========================
   Create Schema
========================= */
export const createPayrollSchema = createSchema(PayrollModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePayrollSchema = updateSchema(
  PayrollModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPayrollSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPayrollIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPayrollSchema = querySchema();