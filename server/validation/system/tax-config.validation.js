import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const taxConfigParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const taxConfigQuerySchema = querySchema();