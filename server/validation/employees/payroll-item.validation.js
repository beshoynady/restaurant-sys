import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const payrollItemParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const payrollItemQuerySchema = querySchema();