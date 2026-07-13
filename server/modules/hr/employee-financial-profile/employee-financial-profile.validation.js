import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import EmployeeFinancialProfileModel from "./employee-financial-profile.model.js";

// Every nested group on this model (compensation/eligibility/overtimePay/
// disbursement/governmentInfo/leaveSalaryRules/endOfServiceRules) is a plain
// nested object, not a DocumentArray — joiFactory's generic dotted-path
// reassembly (utils/joiFactory.js#buildNestedObjectValidator) already
// handles these correctly with no manual override needed, unlike
// AttendanceSettings' `holidays`/`breaks` (which ARE DocumentArrays).

/* =========================
   Create Schema
========================= */
export const createEmployeeFinancialProfileSchema = createSchema(EmployeeFinancialProfileModel.schema);

/* =========================
   Update Schema
========================= */
export const updateEmployeeFinancialProfileSchema = updateSchema(EmployeeFinancialProfileModel.schema, {
  exclude: ["updatedBy", "employee"],
});

/* =========================
   Params Schema
========================= */
export const paramsEmployeeFinancialProfileSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsEmployeeFinancialProfileIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryEmployeeFinancialProfileSchema = querySchema({
  employee: objectId().optional(),
  branch: objectId().optional(),
  costCenter: objectId().optional(),
  isActive: Joi.boolean().optional(),
});
