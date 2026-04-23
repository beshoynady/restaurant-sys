import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import AssetMaintenanceModel from "./asset-maintenance.model.js";

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
export const paramsAssetMaintenanceSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAssetMaintenanceIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAssetMaintenanceSchema = querySchema();