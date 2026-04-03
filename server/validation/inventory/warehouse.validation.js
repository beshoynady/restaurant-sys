import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsWarehouseSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsWarehouseIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryWarehouseSchema = querySchema();