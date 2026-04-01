import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const employeeParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const employeeQuerySchema = querySchema();