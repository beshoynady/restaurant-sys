import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import EmployeeFinancialModel from "../../models/employees/employee-financial.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeFinancialSchema = createSchema(EmployeeFinancialModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeFinancialSchema = updateSchema(
  EmployeeFinancialModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const employeeFinancialParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const employeeFinancialQuerySchema = querySchema();