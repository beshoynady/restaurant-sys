import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import EmployeeFinancialModel from "../../models/employees\employee-financial.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeFinancialSchema = buildJoiSchema(EmployeeFinancialModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateEmployeeFinancialSchema = (function() {
  const schema = buildJoiSchema(EmployeeFinancialModel.schema);
  return schema.fork(Object.keys(EmployeeFinancialModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const employeeFinancialParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const employeeFinancialQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});