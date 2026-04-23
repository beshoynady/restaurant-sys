import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import WarehouseDocumentModel from "./warehouse-document.model.js";

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
export const paramsWarehouseDocumentSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsWarehouseDocumentIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryWarehouseDocumentSchema = querySchema();