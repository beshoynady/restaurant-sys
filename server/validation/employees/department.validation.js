import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import DepartmentModel from "../../models/employees/department.model.js";

/* =========================
   Create Schema
========================= */
export const createDepartmentSchema = createSchema(DepartmentModel.schema);

/* =========================
   Update Schema
========================= */
export const updateDepartmentSchema = updateSchema(
  DepartmentModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const departmentParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const departmentQuerySchema = querySchema();