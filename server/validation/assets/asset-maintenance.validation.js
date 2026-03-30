import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AssetMaintenanceModel from "../../models/assets/asset-maintenance.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetMaintenanceSchema = buildJoiSchema(AssetMaintenanceModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAssetMaintenanceSchema = (function() {
  const schema = buildJoiSchema(AssetMaintenanceModel.schema);
  return schema.fork(Object.keys(AssetMaintenanceModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const assetMaintenanceParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const assetMaintenanceQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});