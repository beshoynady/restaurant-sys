import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import EmployeeSettingsModel from "../../models/employees/employee-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeSettingsSchema = createSchema(EmployeeSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeSettingsSchema = updateSchema(
  EmployeeSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const employeeSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const employeeSettingsQuerySchema = querySchema();