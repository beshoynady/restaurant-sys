import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PaymentProviderModel from "../../models/paymentProvider/payment-provider.model.js";

/* =========================
   Create Schema
========================= */
export const createPaymentProviderSchema = buildJoiSchema(PaymentProviderModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePaymentProviderSchema = (function() {
  const schema = buildJoiSchema(PaymentProviderModel.schema);
  return schema.fork(Object.keys(PaymentProviderModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const paymentProviderParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const paymentProviderQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});