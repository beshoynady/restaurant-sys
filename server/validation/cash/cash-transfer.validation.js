import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import CashTransferModel from "../../models/cash\cash-transfer.model.js";

/* =========================
   Create Schema
========================= */
export const createCashTransferSchema = buildJoiSchema(CashTransferModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateCashTransferSchema = (function() {
  const schema = buildJoiSchema(CashTransferModel.schema);
  return schema.fork(Object.keys(CashTransferModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const cashTransferParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const cashTransferQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});