import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import DepartmentModel from "../../models/employees/department.model.js";

/* =========================
   Create Schema
========================= */
export const createDepartmentSchema = buildJoiSchema(DepartmentModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateDepartmentSchema = (function() {
  const schema = buildJoiSchema(DepartmentModel.schema);
  return schema.fork(Object.keys(DepartmentModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const departmentParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const departmentQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});