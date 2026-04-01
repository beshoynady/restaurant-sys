import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import InventoryCountModel from "../../models/inventory/inventory-count.model.js";

/* =========================
   Create Schema
========================= */
export const createInventoryCountSchema = createSchema(InventoryCountModel.schema);

/* =========================
   Update Schema
========================= */
export const updateInventoryCountSchema = updateSchema(
  InventoryCountModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const inventoryCountParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const inventoryCountQuerySchema = querySchema();