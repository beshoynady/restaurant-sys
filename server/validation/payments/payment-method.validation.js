import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PaymentMethodModel from "../../models/payments/payment-method.model.js";

/* =========================
   Create Schema
========================= */
export const createPaymentMethodSchema = buildJoiSchema(PaymentMethodModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePaymentMethodSchema = (function() {
  const schema = buildJoiSchema(PaymentMethodModel.schema);
  return schema.fork(Object.keys(PaymentMethodModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const paymentMethodParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const paymentMethodQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});