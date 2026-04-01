import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import OrderSettingsModel from "../../models/sales/order-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createOrderSettingsSchema = createSchema(OrderSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateOrderSettingsSchema = updateSchema(
  OrderSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const orderSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const orderSettingsQuerySchema = querySchema();