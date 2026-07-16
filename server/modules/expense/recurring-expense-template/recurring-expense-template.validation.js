import Joi from "joi";
import { objectId, multiLang, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";

const paymentTemplateLine = Joi.object({
  paymentMethod: objectId().required(),
  amount: Joi.number().positive().required(),
  cashRegister: objectId().optional(),
  bankAccount: objectId().optional(),
  paidBy: objectId().required(),
});

export const createRecurringExpenseTemplateSchema = Joi.object({
  name: multiLang({ minlength: 2, maxlength: 100 }, true),
  expense: objectId().required(),
  expenseDescription: Joi.string().trim().max(300).required(),
  costCenter: objectId(true).optional(),
  taxAmount: Joi.number().min(0).optional(),
  frequency: Joi.string().valid("Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "Custom").required(),
  customIntervalDays: Joi.number().integer().min(1).optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().optional().allow(null),
  paymentTemplate: Joi.array().items(paymentTemplateLine).min(1).required(),
  requireApproval: Joi.boolean().optional(),
  notes: Joi.string().trim().max(500).optional().allow(null, ""),
});

export const updateRecurringExpenseTemplateSchema = Joi.object({
  name: multiLang({ minlength: 2, maxlength: 100 }, false),
  expense: objectId().optional(),
  expenseDescription: Joi.string().trim().max(300).optional(),
  costCenter: objectId(true).optional(),
  taxAmount: Joi.number().min(0).optional(),
  frequency: Joi.string().valid("Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "Custom").optional(),
  customIntervalDays: Joi.number().integer().min(1).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional().allow(null),
  paymentTemplate: Joi.array().items(paymentTemplateLine).min(1).optional(),
  requireApproval: Joi.boolean().optional(),
  notes: Joi.string().trim().max(500).optional().allow(null, ""),
});

export const generateDueOccurrencesSchema = Joi.object({
  branch: objectId(true).optional(),
  asOfDate: Joi.date().optional(),
});

export const paramsRecurringExpenseTemplateSchema = paramsSchema();
export const paramsRecurringExpenseTemplateIdsSchema = paramsIdsSchema();
export const queryRecurringExpenseTemplateSchema = querySchema();
