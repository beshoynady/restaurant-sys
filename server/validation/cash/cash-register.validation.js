import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import CashRegisterModel from "../../models/cash\cash-register.model.js";

/* =========================
   Create Schema
========================= */
export const createCashRegisterSchema = buildJoiSchema(CashRegisterModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateCashRegisterSchema = (function() {
  const schema = buildJoiSchema(CashRegisterModel.schema);
  return schema.fork(Object.keys(CashRegisterModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const cashRegisterParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const cashRegisterQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});