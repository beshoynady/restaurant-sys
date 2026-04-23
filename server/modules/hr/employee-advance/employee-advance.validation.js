import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import EmployeeAdvanceModel from "./employee-advance.model.js";

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
export const paramsEmployeeAdvanceSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeAdvanceIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryEmployeeAdvanceSchema = querySchema();