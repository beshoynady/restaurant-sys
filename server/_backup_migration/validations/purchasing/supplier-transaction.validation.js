import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsSupplierTransactionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsSupplierTransactionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const querySupplierTransactionSchema = querySchema();