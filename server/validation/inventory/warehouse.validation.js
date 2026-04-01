import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import WarehouseModel from "../../models/inventory/warehouse.model.js";

/* =========================
   Create Schema
========================= */
export const createWarehouseSchema = createSchema(WarehouseModel.schema);

/* =========================
   Update Schema
========================= */
export const updateWarehouseSchema = updateSchema(
  WarehouseModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const warehouseParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const warehouseQuerySchema = querySchema();