import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ConsumptionModel from "../../models/inventory\consumption.model.js";

/* =========================
   Create Schema
========================= */
export const createConsumptionSchema = buildJoiSchema(ConsumptionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateConsumptionSchema = (function() {
  const schema = buildJoiSchema(ConsumptionModel.schema);
  return schema.fork(Object.keys(ConsumptionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const consumptionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const consumptionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});