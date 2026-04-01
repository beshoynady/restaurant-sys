import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PaymentMethodModel from "../../models/payments/payment-method.model.js";

/* =========================
   Create Schema
========================= */
export const createPaymentMethodSchema = createSchema(PaymentMethodModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePaymentMethodSchema = updateSchema(
  PaymentMethodModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paymentMethodParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const paymentMethodQuerySchema = querySchema();