import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsMenuSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsMenuSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryMenuSettingsSchema = querySchema();