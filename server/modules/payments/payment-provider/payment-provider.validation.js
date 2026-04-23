import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import PaymentProviderModel from "./payment-provider.model.js";

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
export const paramsPaymentProviderSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPaymentProviderIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPaymentProviderSchema = querySchema();