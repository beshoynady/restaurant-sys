import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import WarehouseDocumentModel from "../../models/inventory\warehouse-document.model.js";

/* =========================
   Create Schema
========================= */
export const createWarehouseDocumentSchema = buildJoiSchema(WarehouseDocumentModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateWarehouseDocumentSchema = (function() {
  const schema = buildJoiSchema(WarehouseDocumentModel.schema);
  return schema.fork(Object.keys(WarehouseDocumentModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const warehouseDocumentParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const warehouseDocumentQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});