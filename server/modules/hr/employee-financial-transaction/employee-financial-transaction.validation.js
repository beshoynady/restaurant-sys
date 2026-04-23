import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import EmployeeFinancialTransactionModel from "./employee-financial-transaction.model.js";

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
export const paramsEmployeeFinancialTransactionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeFinancialTransactionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryEmployeeFinancialTransactionSchema = querySchema();