import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import ConsumptionModel from "../../models/inventory/consumption.model.js";

/* =========================
   Create Schema
========================= */
export const createConsumptionSchema = createSchema(ConsumptionModel.schema);

/* =========================
   Update Schema
========================= */
export const updateConsumptionSchema = updateSchema(
  ConsumptionModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsConsumptionSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsConsumptionIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryConsumptionSchema = querySchema();