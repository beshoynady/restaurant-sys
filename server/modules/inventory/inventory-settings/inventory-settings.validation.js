import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import InventorySettingsModel from "./inventory-settings.model.js";

export const createInventorySettingsSchema = createSchema(InventorySettingsModel.schema);

export const updateInventorySettingsSchema = updateSchema(
  InventorySettingsModel.schema,
  ["updatedBy"]
);

export const paramsInventorySettingsSchema = paramsSchema();

export const paramsInventorySettingsIdsSchema = paramsIdsSchema();

export const queryInventorySettingsSchema = querySchema();
