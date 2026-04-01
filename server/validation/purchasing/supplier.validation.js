import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import SupplierModel from "../../models/purchasing/supplier.model.js";

/* =========================
   Create Schema
========================= */
export const createSupplierSchema = createSchema(SupplierModel.schema);

/* =========================
   Update Schema
========================= */
export const updateSupplierSchema = updateSchema(
  SupplierModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const supplierParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const supplierQuerySchema = querySchema();