import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import OrderModel from "./order.model.js";

/* =========================
   Create Schema
========================= */
export const createOrderSchema = createSchema(OrderModel.schema);

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