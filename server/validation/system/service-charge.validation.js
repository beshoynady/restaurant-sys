import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import ServiceChargeModel from "../../models/system/service-charge.model.js";

/* =========================
   Create Schema
========================= */
export const createServiceChargeSchema = createSchema(ServiceChargeModel.schema);

/* =========================
   Update Schema
========================= */
export const updateServiceChargeSchema = updateSchema(
  ServiceChargeModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const serviceChargeParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const serviceChargeQuerySchema = querySchema();