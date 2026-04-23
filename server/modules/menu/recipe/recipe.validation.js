import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import RecipeModel from "./recipe.model.js";

/* =========================
   Create Schema
========================= */
export const createRecipeSchema = createSchema(RecipeModel.schema);

/* =========================
   Update Schema
========================= */
export const updateRecipeSchema = updateSchema(
  RecipeModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsRecipeSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsRecipeIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryRecipeSchema = querySchema();