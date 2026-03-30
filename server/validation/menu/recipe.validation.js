import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import RecipeModel from "../../models/menu/recipe.model.js";

/* =========================
   Create Schema
========================= */
export const createRecipeSchema = buildJoiSchema(RecipeModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateRecipeSchema = (function() {
  const schema = buildJoiSchema(RecipeModel.schema);
  return schema.fork(Object.keys(RecipeModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const recipeParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const recipeQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});