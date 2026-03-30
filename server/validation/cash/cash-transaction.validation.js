import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import CashTransactionModel from "../../models/cash\cash-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createCashTransactionSchema = buildJoiSchema(CashTransactionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateCashTransactionSchema = (function() {
  const schema = buildJoiSchema(CashTransactionModel.schema);
  return schema.fork(Object.keys(CashTransactionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const cashTransactionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const cashTransactionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});