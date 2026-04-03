import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsPaymentChannelSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPaymentChannelIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPaymentChannelSchema = querySchema();