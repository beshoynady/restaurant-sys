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