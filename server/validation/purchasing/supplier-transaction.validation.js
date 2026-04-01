import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import SupplierTransactionModel from "../../models/purchasing/supplier-transaction.model.js";

/* =========================
   Create Schema
========================= */
export const createSupplierTransactionSchema = createSchema(SupplierTransactionModel.schema);

/* =========================
   Update Schema
========================= */
export const updateSupplierTransactionSchema = updateSchema(
  SupplierTransactionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const supplierTransactionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const supplierTransactionQuerySchema = querySchema();