import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import TableModel from "./table.model.js";

/* =========================
   Create Schema
========================= */
export const createTableSchema = createSchema(TableModel.schema);

/* =========================
   Update Schema
========================= */
export const updateTableSchema = updateSchema(
  TableModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsTableSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsTableIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryTableSchema = querySchema();