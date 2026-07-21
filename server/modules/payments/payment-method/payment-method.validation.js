import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import PaymentMethodModel from "./payment-method.model.js";

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

/* =========================
   Resolve Schema — Enterprise Payment Platform V1 Phase 2
========================= */
export const resolvePaymentMethodQuerySchema = Joi.object({
  channel: Joi.string()
    .valid("POS", "SELF_ORDERING", "QR", "WEBSITE", "MOBILE", "DELIVERY", "CALL_CENTER", "MARKETPLACE", "KIOSK", "ADMIN_DASHBOARD")
    .optional(),
  cashRegister: objectId().optional(),
});