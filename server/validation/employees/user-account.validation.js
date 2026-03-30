import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import UserAccountModel from "../../models/employees\user-account.model.js";

/* =========================
   Create Schema
========================= */
export const createUserAccountSchema = buildJoiSchema(UserAccountModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateUserAccountSchema = (function() {
  const schema = buildJoiSchema(UserAccountModel.schema);
  return schema.fork(Object.keys(UserAccountModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const userAccountParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const userAccountQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});