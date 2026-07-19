// Joi validation — ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1. Schema-level shape/type only —
// the cross-field business rule (tenders sum vs. invoice balance) lives in
// payment.service.js#recordPayment, not here (matches ERP_DEVELOPMENT_STANDARD.md §1).
import Joi from "joi";
import { objectId, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";

const tenderSchema = Joi.object({
  paymentMethod: objectId().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().length(3).optional(),
  reference: Joi.string().trim().max(200).optional().allow(null, ""),
  cashRegister: objectId().optional().allow(null),
});

export const recordPaymentSchema = Joi.object({
  invoice: objectId().required(),
  cashierShift: objectId().optional().allow(null),
  idempotencyKey: Joi.string().trim().max(100).optional().allow(null, ""),
  tenders: Joi.array().items(tenderSchema).min(1).required(),
});

export const paramsPaymentSchema = paramsSchema();
export const paramsPaymentIdsSchema = paramsIdsSchema();
export const queryPaymentSchema = querySchema();
