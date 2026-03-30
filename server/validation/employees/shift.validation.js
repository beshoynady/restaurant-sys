import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import ShiftModel from "../../models/employees/shift.model.js";

/* =========================
   Create Schema
========================= */
export const createShiftSchema = buildJoiSchema(ShiftModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateShiftSchema = (function() {
  const schema = buildJoiSchema(ShiftModel.schema);
  return schema.fork(Object.keys(ShiftModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const shiftParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const shiftQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});