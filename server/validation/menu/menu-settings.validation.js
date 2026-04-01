import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import MenuSettingsModel from "../../models/menu/menu-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createMenuSettingsSchema = createSchema(MenuSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateMenuSettingsSchema = updateSchema(
  MenuSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const menuSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const menuSettingsQuerySchema = querySchema();