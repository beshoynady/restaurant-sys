import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import EmployeeSettingsModel from "./employee-settings.model.js";

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
export const paramsEmployeeSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryEmployeeSettingsSchema = querySchema();
