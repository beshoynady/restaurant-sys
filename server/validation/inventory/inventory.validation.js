import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import InventoryModel from "../../models/inventory/inventory.model.js";

/* =========================
   Create Schema
========================= */
export const createInventorySchema = createSchema(InventoryModel.schema);

/* =========================
   Update Schema
========================= */
export const updateInventorySchema = updateSchema(
  InventoryModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const inventoryParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const inventoryQuerySchema = querySchema();