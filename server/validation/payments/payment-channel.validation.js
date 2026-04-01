import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PaymentChannelModel from "../../models/payments/payment-channel.model.js";

/* =========================
   Create Schema
========================= */
export const createPaymentChannelSchema = createSchema(PaymentChannelModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePaymentChannelSchema = updateSchema(
  PaymentChannelModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paymentChannelParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const paymentChannelQuerySchema = querySchema();