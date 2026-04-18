import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import PreparationReturnSettingsModel from "../../models/kitchen/preparation-return-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPreparationReturnSettingsSchema = createSchema(PreparationReturnSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePreparationReturnSettingsSchema = updateSchema(
  PreparationReturnSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPreparationReturnSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPreparationReturnSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPreparationReturnSettingsSchema = querySchema();