import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import CashierShiftModel from "../../models/employees/cashier-shift.model.js";

/* =========================
   Create Schema
========================= */
export const createCashierShiftSchema = buildJoiSchema(CashierShiftModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateCashierShiftSchema = (function() {
  const schema = buildJoiSchema(CashierShiftModel.schema);
  return schema.fork(Object.keys(CashierShiftModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const cashierShiftParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const cashierShiftQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});