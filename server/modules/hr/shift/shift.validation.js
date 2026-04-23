import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import ShiftModel from "./shift.model.js";

/* =========================
   Create Schema
========================= */
export const createShiftSchema = createSchema(ShiftModel.schema);

/* =========================
   Update Schema
========================= */
export const updateShiftSchema = updateSchema(
  ShiftModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsShiftSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsShiftIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryShiftSchema = querySchema();