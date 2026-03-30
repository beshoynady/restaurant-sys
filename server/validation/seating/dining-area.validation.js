import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import DiningAreaModel from "../../models/seating/dining-area.model.js";

/* =========================
   Create Schema
========================= */
export const createDiningAreaSchema = buildJoiSchema(DiningAreaModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateDiningAreaSchema = (function() {
  const schema = buildJoiSchema(DiningAreaModel.schema);
  return schema.fork(Object.keys(DiningAreaModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const diningAreaParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const diningAreaQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});