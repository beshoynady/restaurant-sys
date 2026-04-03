import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsPaymentMethodSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPaymentMethodIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPaymentMethodSchema = querySchema();