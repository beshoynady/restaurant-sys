import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import ProductionRecipeModel from "../../models/production/production-recipe.model.js";

/* =========================
   Create Schema
========================= */
export const createProductionRecipeSchema = createSchema(ProductionRecipeModel.schema);

/* =========================
   Update Schema
========================= */
export const updateProductionRecipeSchema = updateSchema(
  ProductionRecipeModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const productionRecipeParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const productionRecipeQuerySchema = querySchema();