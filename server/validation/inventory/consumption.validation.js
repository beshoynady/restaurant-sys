import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const consumptionParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const consumptionQuerySchema = querySchema();