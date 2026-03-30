import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import OrderModel from "../../models/sales\order.model.js";

/* =========================
   Create Schema
========================= */
export const createOrderSchema = buildJoiSchema(OrderModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateOrderSchema = (function() {
  const schema = buildJoiSchema(OrderModel.schema);
  return schema.fork(Object.keys(OrderModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const orderParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const orderQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});