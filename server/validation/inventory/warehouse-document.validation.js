import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import WarehouseDocumentModel from "../../models/inventory/warehouse-document.model.js";

/* =========================
   Create Schema
========================= */
export const createWarehouseDocumentSchema = createSchema(WarehouseDocumentModel.schema);

/* =========================
   Update Schema
========================= */
export const updateWarehouseDocumentSchema = updateSchema(
  WarehouseDocumentModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const warehouseDocumentParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const warehouseDocumentQuerySchema = querySchema();