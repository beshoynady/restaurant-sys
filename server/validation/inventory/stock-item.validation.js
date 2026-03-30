import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import StockItemModel from "../../models/inventory\stock-item.model.js";

/* =========================
   Create Schema
========================= */
export const createStockItemSchema = buildJoiSchema(StockItemModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateStockItemSchema = (function() {
  const schema = buildJoiSchema(StockItemModel.schema);
  return schema.fork(Object.keys(StockItemModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const stockItemParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const stockItemQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});