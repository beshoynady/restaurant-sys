import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import MenuCategoryModel from "./menu-category.model.js";

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
export const paramsMenuCategorySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsMenuCategoryIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryMenuCategorySchema = querySchema();