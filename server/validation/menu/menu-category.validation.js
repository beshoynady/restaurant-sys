import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import MenuCategoryModel from "../../models/menu/menu-category.model.js";

/* =========================
   Create Schema
========================= */
export const createMenuCategorySchema = createSchema(MenuCategoryModel.schema);

/* =========================
   Update Schema
========================= */
export const updateMenuCategorySchema = updateSchema(
  MenuCategoryModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const menuCategoryParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const menuCategoryQuerySchema = querySchema();