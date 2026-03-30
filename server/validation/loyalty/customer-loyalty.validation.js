import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import CustomerLoyaltyModel from "../../models/loyalty\customer-loyalty.model.js";

/* =========================
   Create Schema
========================= */
export const createCustomerLoyaltySchema = buildJoiSchema(CustomerLoyaltyModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateCustomerLoyaltySchema = (function() {
  const schema = buildJoiSchema(CustomerLoyaltyModel.schema);
  return schema.fork(Object.keys(CustomerLoyaltyModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const customerLoyaltyParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const customerLoyaltyQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});