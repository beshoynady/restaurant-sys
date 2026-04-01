import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import EmployeeAdvanceModel from "../../models/employees/employee-advance.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeAdvanceSchema = createSchema(EmployeeAdvanceModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeAdvanceSchema = updateSchema(
  EmployeeAdvanceModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const employeeAdvanceParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const employeeAdvanceQuerySchema = querySchema();