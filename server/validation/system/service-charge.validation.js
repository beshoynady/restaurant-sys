import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ServiceChargeModel from "../../models/system\service-charge.model.js";

/* =========================
   Create Schema
========================= */
export const createServiceChargeSchema = buildJoiSchema(ServiceChargeModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateServiceChargeSchema = (function() {
  const schema = buildJoiSchema(ServiceChargeModel.schema);
  return schema.fork(Object.keys(ServiceChargeModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const serviceChargeParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const serviceChargeQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});