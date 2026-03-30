import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import InventorySettingsModel from "../../models/inventory\inventory-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createInventorySettingsSchema = buildJoiSchema(InventorySettingsModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateInventorySettingsSchema = (function() {
  const schema = buildJoiSchema(InventorySettingsModel.schema);
  return schema.fork(Object.keys(InventorySettingsModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const inventorySettingsParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const inventorySettingsQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});