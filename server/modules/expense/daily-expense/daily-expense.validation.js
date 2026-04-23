import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import DailyExpenseModel from "./daily-expense.model.js";

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
export const paramsDailyExpenseSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsDailyExpenseIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryDailyExpenseSchema = querySchema();