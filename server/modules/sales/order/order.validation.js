import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import OrderModel from "./order.model.js";

/* =========================
   Create Schema
========================= */
// DB-007: `orderNum` is now server-generated (see order.service.ts's beforeCreate hook) — excluded
// here so a client-supplied value is silently stripped (stripUnknown: true) rather than accepted
// or rejected, keeping old clients that still send one compatible.
export const createOrderSchema = createSchema(OrderModel.schema, { exclude: ["orderNum"] });

/* =========================
   Update Schema
========================= */
export const updateOrderSchema = updateSchema(
  OrderModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsOrderSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsOrderIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryOrderSchema = querySchema();

export const transitionOrderSchema = Joi.object({
  status: Joi.string().valid("IN_PROGRESS", "READY", "DELIVERED", "CLOSED", "CANCELLED").required(),
});

// `reason` is optional at the schema level — `OrderSettings.cancelReasonRequired` decides per
// brand/branch whether it's actually mandatory, enforced in order.service.ts#cancelItem, not here.
export const cancelOrderItemSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(300).optional().allow(null, ""),
  managerApprovalBy: objectId().optional().allow(null),
});

export const paramsOrderItemSchema = Joi.object({
  id: objectId().required(),
  itemId: objectId().required(),
});