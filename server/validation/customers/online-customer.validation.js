import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import OnlineCustomerModel from "../../models/customers/online-customer.model.js";

/* =========================
   Create Schema
========================= */
export const createOnlineCustomerSchema = buildJoiSchema(OnlineCustomerModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateOnlineCustomerSchema = (function() {
  const schema = buildJoiSchema(OnlineCustomerModel.schema);
  return schema.fork(Object.keys(OnlineCustomerModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const onlineCustomerParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const onlineCustomerQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});