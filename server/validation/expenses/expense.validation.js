import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsExpenseSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsExpenseIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryExpenseSchema = querySchema();