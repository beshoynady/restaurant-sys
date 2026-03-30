import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AssetDepreciationModel from "../../models/assets/asset-depreciation.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetDepreciationSchema = buildJoiSchema(AssetDepreciationModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAssetDepreciationSchema = (function() {
  const schema = buildJoiSchema(AssetDepreciationModel.schema);
  return schema.fork(Object.keys(AssetDepreciationModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const assetDepreciationParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const assetDepreciationQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});