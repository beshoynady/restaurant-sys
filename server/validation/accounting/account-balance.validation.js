import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AccountBalanceModel from "../../models/accounting\account-balance.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountBalanceSchema = buildJoiSchema(AccountBalanceModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAccountBalanceSchema = (function() {
  const schema = buildJoiSchema(AccountBalanceModel.schema);
  return schema.fork(Object.keys(AccountBalanceModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const accountBalanceParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const accountBalanceQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});