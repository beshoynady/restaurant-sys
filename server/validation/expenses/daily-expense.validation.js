import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import DailyExpenseModel from "../../models/expenses\daily-expense.model.js";

/* =========================
   Create Schema
========================= */
export const createDailyExpenseSchema = buildJoiSchema(DailyExpenseModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateDailyExpenseSchema = (function() {
  const schema = buildJoiSchema(DailyExpenseModel.schema);
  return schema.fork(Object.keys(DailyExpenseModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const dailyExpenseParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const dailyExpenseQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});