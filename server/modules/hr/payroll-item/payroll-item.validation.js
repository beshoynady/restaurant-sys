import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PayrollItemModel from "./payroll-item.model.js";

// `formula.tokens`/`executionCondition.tokens` are DocumentArrays —
// joiFactory's generic array handler falls back to `Joi.array().items(Joi.any())`
// for these (no shape checking), same case already handled for
// AttendanceSettings' `holidays`/`breaks`.
const tokenSchema = Joi.object({
  type: Joi.string().valid("VAR", "OP", "LPAREN", "RPAREN", "NUMBER", "PERCENT").required(),
  value: Joi.string().trim().required(),
});

const tokenListOverride = {
  formula: Joi.object({ tokens: Joi.array().items(tokenSchema) }).optional(),
  executionCondition: Joi.object({ tokens: Joi.array().items(tokenSchema) }).optional(),
};

export const createPayrollItemSchema = createSchema(PayrollItemModel.schema).keys(tokenListOverride);

export const updatePayrollItemSchema = updateSchema(PayrollItemModel.schema, {
  exclude: ["updatedBy"],
}).keys(tokenListOverride);

export const paramsPayrollItemSchema = paramsSchema();
export const paramsPayrollItemIdsSchema = paramsIdsSchema();

export const queryPayrollItemSchema = querySchema({
  branch: objectId().optional(),
  category: Joi.string().valid("EARNING", "DEDUCTION", "TAX", "INSURANCE").optional(),
  calculationType: Joi.string().valid("FIXED", "RATE", "FORMULA", "MANUAL").optional(),
  isActive: Joi.boolean().optional(),
});

export const evaluatePayrollItemSchema = Joi.object({
  context: Joi.object({
    dependencyResults: Joi.object().pattern(Joi.string(), Joi.number()).optional(),
  })
    .pattern(Joi.string(), Joi.alternatives(Joi.number(), Joi.object()))
    .required(),
}).unknown(false);
