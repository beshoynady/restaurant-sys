import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import LoyaltyRewardModel from "../../models/loyalty\loyalty-reward.model.js";

/* =========================
   Create Schema
========================= */
export const createLoyaltyRewardSchema = buildJoiSchema(LoyaltyRewardModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateLoyaltyRewardSchema = (function() {
  const schema = buildJoiSchema(LoyaltyRewardModel.schema);
  return schema.fork(Object.keys(LoyaltyRewardModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const loyaltyRewardParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const loyaltyRewardQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});