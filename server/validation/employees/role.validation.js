import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import RoleModel from "../../models/employees\role.model.js";

/* =========================
   Create Schema
========================= */
export const createRoleSchema = buildJoiSchema(RoleModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateRoleSchema = (function() {
  const schema = buildJoiSchema(RoleModel.schema);
  return schema.fork(Object.keys(RoleModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const roleParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const roleQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});