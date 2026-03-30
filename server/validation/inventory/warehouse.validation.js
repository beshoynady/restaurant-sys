import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import WarehouseModel from "../../models/inventory/warehouse.model.js";

/* =========================
   Create Schema
========================= */
export const createWarehouseSchema = buildJoiSchema(WarehouseModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateWarehouseSchema = (function() {
  const schema = buildJoiSchema(WarehouseModel.schema);
  return schema.fork(Object.keys(WarehouseModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const warehouseParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const warehouseQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});