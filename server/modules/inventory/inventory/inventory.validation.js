import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import InventoryModel from "./inventory.model.js";

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
export const paramsInventorySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsInventoryIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryInventorySchema = querySchema();