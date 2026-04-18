import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import AssetTransactionsModel from "../../models/assets/asset-transactions.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetTransactionsSchema = createSchema(AssetTransactionsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAssetTransactionsSchema = updateSchema(
  AssetTransactionsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsAssetTransactionsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAssetTransactionsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAssetTransactionsSchema = querySchema();