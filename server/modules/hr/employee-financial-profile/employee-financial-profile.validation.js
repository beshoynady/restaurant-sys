import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import EmployeeFinancialModel from "./employee-financial.model.js";

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
export const paramsEmployeeFinancialSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeFinancialIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryEmployeeFinancialSchema = querySchema();