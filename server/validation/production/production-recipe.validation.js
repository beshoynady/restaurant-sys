import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ProductionRecipeModel from "../../models/production\production-recipe.model.js";

/* =========================
   Create Schema
========================= */
export const createProductionRecipeSchema = buildJoiSchema(ProductionRecipeModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateProductionRecipeSchema = (function() {
  const schema = buildJoiSchema(ProductionRecipeModel.schema);
  return schema.fork(Object.keys(ProductionRecipeModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const productionRecipeParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const productionRecipeQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});