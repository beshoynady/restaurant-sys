import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import ShiftModel from "../../models/employees/shift.model.js";

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
export const shiftParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const shiftQuerySchema = querySchema();