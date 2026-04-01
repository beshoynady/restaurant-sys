import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import RecipeModel from "../../models/menu/recipe.model.js";

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
export const recipeParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const recipeQuerySchema = querySchema();