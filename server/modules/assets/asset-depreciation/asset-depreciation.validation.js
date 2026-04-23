import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import AssetDepreciationModel from "./asset-depreciation.model.js";

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
export const paramsAssetDepreciationSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAssetDepreciationIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAssetDepreciationSchema = querySchema();