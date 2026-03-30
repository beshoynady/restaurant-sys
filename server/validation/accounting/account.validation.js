import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AccountModel from "../../models/accounting\account.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountSchema = buildJoiSchema(AccountModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAccountSchema = (function() {
  const schema = buildJoiSchema(AccountModel.schema);
  return schema.fork(Object.keys(AccountModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const accountParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const accountQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});