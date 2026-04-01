import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import PurchaseReturnModel from "../../models/purchasing/purchase-return.model.js";

/* =========================
   Create Schema
========================= */
export const createPurchaseReturnSchema = createSchema(PurchaseReturnModel.schema);

/* =========================
   Update Schema
========================= */
export const updatePurchaseReturnSchema = updateSchema(
  PurchaseReturnModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const purchaseReturnParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const purchaseReturnQuerySchema = querySchema();