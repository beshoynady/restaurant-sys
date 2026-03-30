import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import BankAccountModel from "../../models/cash/bank-account.model.js";

/* =========================
   Create Schema
========================= */
export const createBankAccountSchema = buildJoiSchema(BankAccountModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateBankAccountSchema = (function() {
  const schema = buildJoiSchema(BankAccountModel.schema);
  return schema.fork(Object.keys(BankAccountModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const bankAccountParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const bankAccountQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});