import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import SalesReturnSettingsModel from "./sales-return-settings.model.js";

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
export const paramsSalesReturnSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsSalesReturnSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const querySalesReturnSettingsSchema = querySchema();