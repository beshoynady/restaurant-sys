import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import EmployeeSettingsModel from "../../models/employees/employee-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createEmployeeSettingsSchema = buildJoiSchema(EmployeeSettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateEmployeeSettingsSchema = (function() {
  const schema = buildJoiSchema(EmployeeSettingsModel.schema);
  return schema.fork(Object.keys(EmployeeSettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const employeeSettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const employeeSettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});