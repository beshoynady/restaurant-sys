import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import SalesReturnSettingsModel from "../../models/sales/sales-return-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createSalesReturnSettingsSchema = createSchema(SalesReturnSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updateSalesReturnSettingsSchema = updateSchema(
  SalesReturnSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const salesReturnSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const salesReturnSettingsQuerySchema = querySchema();