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

/* =========================
   Generation Engine Schema
========================= */
export const generateAssetDepreciationSchema = Joi.object({
  asset: objectId().required(),
  periodLabel: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required(),
});