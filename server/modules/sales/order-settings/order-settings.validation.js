import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import OrderSettingsModel from "./order-settings.model.js";

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
export const paramsOrderSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsOrderSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryOrderSettingsSchema = querySchema();