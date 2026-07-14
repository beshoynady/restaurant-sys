import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import ManualConsumptionModel from "./manual-consumption.model.js";

export const createManualConsumptionSchema = createSchema(ManualConsumptionModel.schema);

export const updateManualConsumptionSchema = updateSchema(
  ManualConsumptionModel.schema,
  ["updatedBy"],
);

export const paramsManualConsumptionSchema = paramsSchema();

export const paramsManualConsumptionIdsSchema = paramsIdsSchema();

export const queryManualConsumptionSchema = querySchema();

export const transitionManualConsumptionSchema = Joi.object({
  status: Joi.string().valid("Submitted", "Approved", "Rejected", "Cancelled").required(),
  rejectionReason: Joi.string().trim().max(300).optional(),
});
