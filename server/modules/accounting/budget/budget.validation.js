import Joi from "joi";
import { objectId, multiLang, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";

const monthlyAmounts = Joi.array().items(Joi.number().min(0)).length(12).required();

const budgetLineInput = Joi.object({
  account: objectId().required(),
  monthlyAmounts,
});

export const createBudgetSchema = Joi.object({
  branch: objectId(true).optional(),
  costCenter: objectId(true).optional(),
  fiscalYear: Joi.number().integer().min(2000).max(2100).required(),
  name: multiLang({ minlength: 2, maxlength: 100 }, true),
  notes: Joi.string().trim().max(500).optional().allow(null, ""),
  lines: Joi.array().items(budgetLineInput).min(1).required(),
});

export const updateBudgetLinesSchema = Joi.object({
  lines: Joi.array().items(budgetLineInput).min(1).required(),
});

export const rejectBudgetSchema = Joi.object({
  reason: Joi.string().trim().max(300).optional().allow(null, ""),
});

export const budgetVsActualQuerySchema = Joi.object({
  upToMonth: Joi.number().integer().min(1).max(12).optional(),
});

export const budgetsSummaryQuerySchema = Joi.object({
  fiscalYear: Joi.number().integer().min(2000).max(2100).optional(),
  upToMonth: Joi.number().integer().min(1).max(12).optional(),
  branch: objectId().optional(),
});

export const paramsBudgetSchema = paramsSchema();
export const paramsBudgetIdsSchema = paramsIdsSchema();
export const queryBudgetSchema = querySchema();
