import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import TaxConfigModel from "../../models/system/tax-config.model.js";

/* =========================
   Create Schema
========================= */
export const createTaxConfigSchema = createSchema(TaxConfigModel.schema);

/* =========================
   Update Schema
========================= */
export const updateTaxConfigSchema = updateSchema(
  TaxConfigModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsTaxConfigSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsTaxConfigIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryTaxConfigSchema = querySchema();