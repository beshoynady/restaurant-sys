import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PayrollModel from "../../models/employees\payroll.model.js";

/* =========================
   Create Schema
========================= */
export const createPayrollSchema = buildJoiSchema(PayrollModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePayrollSchema = (function() {
  const schema = buildJoiSchema(PayrollModel.schema);
  return schema.fork(Object.keys(PayrollModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const payrollParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const payrollQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});