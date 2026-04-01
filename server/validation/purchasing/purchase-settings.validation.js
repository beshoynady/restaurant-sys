import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PurchaseSettingsModel from "../../models/purchasing/purchase-settings.model.js";

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
export const purchaseSettingsParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const purchaseSettingsQuerySchema = querySchema();