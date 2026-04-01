import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import TableModel from "../../models/seating/table.model.js";

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
export const tableParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const tableQuerySchema = querySchema();