import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import EmployeeFinancialTransactionModel from "../../models/employees/employee-financial-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeFinancialTransactionSchema = createSchema(EmployeeFinancialTransactionModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeFinancialTransactionSchema = updateSchema(
  EmployeeFinancialTransactionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const employeeFinancialTransactionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const employeeFinancialTransactionQuerySchema = querySchema();