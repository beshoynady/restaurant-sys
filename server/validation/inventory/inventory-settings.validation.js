import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import InventorySettingsModel from "../../models/inventory/inventory-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createInventorySettingsSchema = createSchema(InventorySettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateInventorySettingsSchema = updateSchema(
  InventorySettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const inventorySettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const inventorySettingsQuerySchema = querySchema();