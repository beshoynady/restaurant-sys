import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const preparationReturnSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const preparationReturnSettingsQuerySchema = querySchema();