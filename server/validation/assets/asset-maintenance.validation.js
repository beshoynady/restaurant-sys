import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AssetMaintenanceModel from "../../models/assets/asset-maintenance.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetMaintenanceSchema = createSchema(AssetMaintenanceModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAssetMaintenanceSchema = updateSchema(
  AssetMaintenanceModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const assetMaintenanceParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const assetMaintenanceQuerySchema = querySchema();