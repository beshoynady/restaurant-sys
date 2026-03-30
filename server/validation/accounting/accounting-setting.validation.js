import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AccountingSettingModel from "../../models/accounting/accounting-setting.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountingSettingSchema = buildJoiSchema(AccountingSettingModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAccountingSettingSchema = (function() {
  const schema = buildJoiSchema(AccountingSettingModel.schema);
  return schema.fork(Object.keys(AccountingSettingModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const accountingSettingParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const accountingSettingQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});