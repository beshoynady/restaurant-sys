import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PaymentChannelModel from "../../models/payments/payment-channel.model.js";

/* =========================
   Create Schema
========================= */
export const createPaymentChannelSchema = buildJoiSchema(PaymentChannelModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePaymentChannelSchema = (function() {
  const schema = buildJoiSchema(PaymentChannelModel.schema);
  return schema.fork(Object.keys(PaymentChannelModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const paymentChannelParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const paymentChannelQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});