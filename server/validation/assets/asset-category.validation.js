import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AssetCategoryModel from "../../models/assets/asset-category.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetCategorySchema = buildJoiSchema(AssetCategoryModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAssetCategorySchema = (function() {
  const schema = buildJoiSchema(AssetCategoryModel.schema);
  return schema.fork(Object.keys(AssetCategoryModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const assetCategoryParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const assetCategoryQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});