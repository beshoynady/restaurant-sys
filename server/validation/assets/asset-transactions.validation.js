import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import AssetTransactionsModel from "../../models/assets/asset-transactions.model.js";

/* =========================
   Create Schema
========================= */
export const createAssetTransactionsSchema = buildJoiSchema(AssetTransactionsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateAssetTransactionsSchema = (function() {
  const schema = buildJoiSchema(AssetTransactionsModel.schema);
  return schema.fork(Object.keys(AssetTransactionsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const assetTransactionsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const assetTransactionsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});