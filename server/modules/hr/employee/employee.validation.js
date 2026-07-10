import Joi from "joi";
import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../../utils/joiFactory.js";
import EmployeeModel from "./employee.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeSchema = createSchema(EmployeeModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeSchema = updateSchema(EmployeeModel.schema, [
  "updatedBy",
]);

/* =========================
   Params Schema
========================= */
export const paramsEmployeeSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema (HR Filters)
========================= */
/**
 * Notes (EN):
 * - BaseController.getAll passes ALL req.query keys as `filters` (excluding page/limit/search/includeDeleted/sort/select).
 * - querySchema() is strict (unknown(false)), so we must explicitly allow HR filter fields here.
 * - ObjectId fields use the same validation as in the rest of the project (via joiFactory ObjectId validator inside buildFieldValidator).
 */
export const queryEmployeeSchema = querySchema({
  // ObjectId filters
  brand: Joi.string().optional(),
  department: Joi.string().optional(),
  jobTitle: Joi.string().optional(),
  shift: Joi.string().optional(),

  // String filters
  status: Joi.string().trim().optional(),
  workMode: Joi.string().trim().optional(),
  contractType: Joi.string().trim().optional(),

  // Boolean filters
  hasAccount: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  isOwner: Joi.boolean().optional(),
});
