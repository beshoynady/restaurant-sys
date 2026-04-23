import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import ServiceChargeModel from "./service-charge.model.js";

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
export const paramsServiceChargeSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsServiceChargeIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryServiceChargeSchema = querySchema();