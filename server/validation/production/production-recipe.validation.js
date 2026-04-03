import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsProductionRecipeSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsProductionRecipeIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryProductionRecipeSchema = querySchema();