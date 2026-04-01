import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PaymentProviderModel from "../../models/paymentProvider/payment-provider.model.js";

/* =========================
   Create Schema
========================= */
export const createPaymentProviderSchema = createSchema(PaymentProviderModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePaymentProviderSchema = updateSchema(
  PaymentProviderModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paymentProviderParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const paymentProviderQuerySchema = querySchema();