import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import SupplierModel from "./supplier.model.js";

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
export const paramsSupplierSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsSupplierIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const querySupplierSchema = querySchema();