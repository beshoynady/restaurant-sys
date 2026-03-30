import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import SalesReturnModel from "../../models/sales\sales-return.model.js";

/* =========================
   Create Schema
========================= */
export const createSalesReturnSchema = buildJoiSchema(SalesReturnModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateSalesReturnSchema = (function() {
  const schema = buildJoiSchema(SalesReturnModel.schema);
  return schema.fork(Object.keys(SalesReturnModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const salesReturnParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const salesReturnQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});