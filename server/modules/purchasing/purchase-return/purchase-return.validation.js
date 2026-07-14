import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import PurchaseReturnModel from "./purchase-return.model.js";

/* =========================
   Create Schema
========================= */
export const createPurchaseReturnSchema = createSchema(PurchaseReturnModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePurchaseReturnSchema = updateSchema(
  PurchaseReturnModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPurchaseReturnSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPurchaseReturnIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPurchaseReturnSchema = querySchema();

export const transitionPurchaseReturnSchema = Joi.object({
  status: Joi.string().valid("Draft", "Review", "Partially Refunded", "Fully Refunded", "Rejected", "Cancelled").required(),
});

export const recordPurchaseReturnRefundSchema = Joi.object({
  amount: Joi.number().positive().required(),
  refundMethod: objectId().required(),
  cashRegister: objectId(true).optional(),
  reference: Joi.string().trim().max(200).optional(),
});