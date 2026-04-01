import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AssetDepreciationModel from "../../models/assets/asset-depreciation.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetDepreciationSchema = createSchema(AssetDepreciationModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAssetDepreciationSchema = updateSchema(
  AssetDepreciationModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const assetDepreciationParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const assetDepreciationQuerySchema = querySchema();