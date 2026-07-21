// ADR-001 Phase 2 — schema-level shape/type only; cross-field business rules (approval threshold,
// tender-sum vs. return total, invoice-line eligibility) live in sales-return.service.js, matching
// ERP_DEVELOPMENT_STANDARD.md §1 and payment.validation.js's own precedent.
import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import SalesReturnModel from "./sales-return.model.js";

/* =========================
   Create Schema (generic CRUD path — kept for admin/back-office direct creation; the real
   customer-facing flow is requestRefund, see requestRefundSchema below)
========================= */
export const createSalesReturnSchema = createSchema(SalesReturnModel.schema);

/* =========================
   Update Schema
========================= */
export const updateSalesReturnSchema = updateSchema(
  SalesReturnModel.schema,
  ["updatedBy"]
);

/* =========================
   Params / Query Schemas
========================= */
export const paramsSalesReturnSchema = paramsSchema();
export const paramsSalesReturnIdsSchema = paramsIdsSchema();
export const querySalesReturnSchema = querySchema();

/* =========================
   Action Schemas — ADR-001 Phase 2
========================= */
const tenderSchema = Joi.object({
  method: objectId().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().length(3).optional(),
  cashRegister: objectId().optional().allow(null),
});

export const requestRefundSchema = Joi.object({
  originalInvoice: objectId().required(),
  order: objectId().required(),
  itemIds: Joi.array().items(objectId()).min(1).required(),
  reason: Joi.string().trim().max(500).optional().allow("", null),
  refundMethod: Joi.array().items(tenderSchema).optional(),
  idempotencyKey: Joi.string().trim().max(100).optional().allow(null, ""),
});

export const approveRefundSchema = Joi.object({
  refundMethod: Joi.array().items(tenderSchema).optional(),
});

export const rejectRefundSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional().allow("", null),
});

export const settleRefundSchema = Joi.object({
  refundMethod: Joi.array().items(tenderSchema).min(1).required(),
});
