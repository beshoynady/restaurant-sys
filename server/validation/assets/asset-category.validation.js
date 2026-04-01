import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AssetCategoryModel from "../../models/assets/asset-category.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetCategorySchema = createSchema(AssetCategoryModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAssetCategorySchema = updateSchema(
  AssetCategoryModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const assetCategoryParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const assetCategoryQuerySchema = querySchema();