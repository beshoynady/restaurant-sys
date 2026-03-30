import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import EmployeeFinancialTransactionModel from "../../models/employees\employee-financial-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeFinancialTransactionSchema = buildJoiSchema(EmployeeFinancialTransactionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateEmployeeFinancialTransactionSchema = (function() {
  const schema = buildJoiSchema(EmployeeFinancialTransactionModel.schema);
  return schema.fork(Object.keys(EmployeeFinancialTransactionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const employeeFinancialTransactionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const employeeFinancialTransactionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});