import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import LoyaltyTransactionModel from "../../models/loyalty/loyalty-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createLoyaltyTransactionSchema = buildJoiSchema(LoyaltyTransactionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateLoyaltyTransactionSchema = (function() {
  const schema = buildJoiSchema(LoyaltyTransactionModel.schema);
  return schema.fork(Object.keys(LoyaltyTransactionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const loyaltyTransactionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const loyaltyTransactionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});