import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsAssetCategorySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAssetCategoryIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAssetCategorySchema = querySchema();