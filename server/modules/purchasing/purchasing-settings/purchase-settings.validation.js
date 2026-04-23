import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import PurchaseSettingsModel from "./purchase-settings.model.js";

/* =========================
   Create Schema
========================= */
export const createPurchaseSettingsSchema = createSchema(PurchaseSettingsModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePurchaseSettingsSchema = updateSchema(
  PurchaseSettingsModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsPurchaseSettingsSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsPurchaseSettingsIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryPurchaseSettingsSchema = querySchema();