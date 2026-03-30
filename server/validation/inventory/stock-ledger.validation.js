import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import StockLedgerModel from "../../models/inventory\stock-ledger.model.js";

/* =========================
   Create Schema
========================= */
export const createStockLedgerSchema = buildJoiSchema(StockLedgerModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateStockLedgerSchema = (function() {
  const schema = buildJoiSchema(StockLedgerModel.schema);
  return schema.fork(Object.keys(StockLedgerModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const stockLedgerParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const stockLedgerQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});