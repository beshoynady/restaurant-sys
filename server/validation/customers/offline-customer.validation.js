import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import OfflineCustomerModel from "../../models/customers/offline-customer.model.js";

/* =========================
   Create Schema
========================= */
export const createOfflineCustomerSchema = createSchema(OfflineCustomerModel.schema);

/* =========================
   Update Schema
========================= */
export const updateOfflineCustomerSchema = updateSchema(
  OfflineCustomerModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const offlineCustomerParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const offlineCustomerQuerySchema = querySchema();