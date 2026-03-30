import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AccountingPeriodModel from "../../models/accounting/accounting-period.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountingPeriodSchema = buildJoiSchema(AccountingPeriodModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAccountingPeriodSchema = (function() {
  const schema = buildJoiSchema(AccountingPeriodModel.schema);
  return schema.fork(Object.keys(AccountingPeriodModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const accountingPeriodParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const accountingPeriodQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});