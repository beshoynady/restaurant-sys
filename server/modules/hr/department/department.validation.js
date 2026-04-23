import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import DepartmentModel from "./department.model.js";

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
export const paramsDepartmentSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsDepartmentIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryDepartmentSchema = querySchema();