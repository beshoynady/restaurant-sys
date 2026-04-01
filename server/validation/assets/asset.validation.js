import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AssetModel from "../../models/assets/asset.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetSchema = createSchema(AssetModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAssetSchema = updateSchema(
  AssetModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const assetParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const assetQuerySchema = querySchema();