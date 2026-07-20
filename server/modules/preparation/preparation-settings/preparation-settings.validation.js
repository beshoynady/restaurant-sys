import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PreparationSettingsModel from "./preparation-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationSettingsSchema = createSchema(PreparationSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePreparationSettingsSchema = updateSchema(
  PreparationSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPreparationSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPreparationSettingsIdsSchema = paramsIdsSchema();

/* =========================
   Query Schema
========================= */
export const queryPreparationSettingsSchema = querySchema();
