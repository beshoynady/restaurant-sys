import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const assetTransactionsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const assetTransactionsQuerySchema = querySchema();