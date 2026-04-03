import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import PrintSettingsModel from "../../models/system/print-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPrintSettingsSchema = createSchema(PrintSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePrintSettingsSchema = updateSchema(
  PrintSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPrintSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPrintSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPrintSettingsSchema = querySchema();