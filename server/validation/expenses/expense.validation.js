import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import ExpenseModel from "../../models/expenses/expense.model.js";

/* =========================
   Create Schema
========================= */
export const createExpenseSchema = createSchema(ExpenseModel.schema);

/* =========================
   Update Schema
========================= */
export const updateExpenseSchema = updateSchema(
  ExpenseModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const expenseParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const expenseQuerySchema = querySchema();