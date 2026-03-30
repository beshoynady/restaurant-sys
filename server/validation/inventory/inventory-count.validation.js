import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import InventoryCountModel from "../../models/inventory/inventory-count.model.js";

/* =========================
   Create Schema
========================= */
export const createInventoryCountSchema = buildJoiSchema(InventoryCountModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateInventoryCountSchema = (function() {
  const schema = buildJoiSchema(InventoryCountModel.schema);
  return schema.fork(Object.keys(InventoryCountModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const inventoryCountParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const inventoryCountQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});