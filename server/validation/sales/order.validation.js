import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import OrderModel from "../../models/sales/order.model.js";

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
export const orderParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const orderQuerySchema = querySchema();