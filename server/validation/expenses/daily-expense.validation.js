import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import DailyExpenseModel from "../../models/expenses/daily-expense.model.js";

/* =========================
   Create Schema
========================= */
export const createDailyExpenseSchema = createSchema(DailyExpenseModel.schema);

/* =========================
   Update Schema
========================= */
export const updateDailyExpenseSchema = updateSchema(
  DailyExpenseModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const dailyExpenseParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const dailyExpenseQuerySchema = querySchema();