import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ExpenseModel from "../../models/expenses\expense.model.js";

/* =========================
   Create Schema
========================= */
export const createExpenseSchema = buildJoiSchema(ExpenseModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateExpenseSchema = (function() {
  const schema = buildJoiSchema(ExpenseModel.schema);
  return schema.fork(Object.keys(ExpenseModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const expenseParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const expenseQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});