import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import SupplierTransactionModel from "../../models/purchasing/supplier-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createSupplierTransactionSchema = buildJoiSchema(SupplierTransactionModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateSupplierTransactionSchema = (function() {
  const schema = buildJoiSchema(SupplierTransactionModel.schema);
  return schema.fork(Object.keys(SupplierTransactionModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const supplierTransactionParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const supplierTransactionQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});