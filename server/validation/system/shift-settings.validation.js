import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import ShiftSettingsModel from "../../models/system/shift-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createShiftSettingsSchema = createSchema(ShiftSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateShiftSettingsSchema = updateSchema(
  ShiftSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsShiftSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsShiftSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryShiftSettingsSchema = querySchema();