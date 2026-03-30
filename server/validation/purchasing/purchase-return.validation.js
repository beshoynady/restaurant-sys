import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import PurchaseReturnModel from "../../models/purchasing/purchase-return.model.js";

/* =========================
   Create Schema
========================= */
export const createPurchaseReturnSchema = buildJoiSchema(PurchaseReturnModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updatePurchaseReturnSchema = (function() {
  const schema = buildJoiSchema(PurchaseReturnModel.schema);
  return schema.fork(Object.keys(PurchaseReturnModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const purchaseReturnParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const purchaseReturnQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});