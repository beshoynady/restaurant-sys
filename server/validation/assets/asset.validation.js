import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsAssetSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAssetIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAssetSchema = querySchema();