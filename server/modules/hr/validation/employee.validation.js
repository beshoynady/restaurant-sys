import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import EmployeeModel from "../../models/employees/employee.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeSchema = createSchema(EmployeeModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeSchema = updateSchema(
  EmployeeModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsEmployeeSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryEmployeeSchema = querySchema();