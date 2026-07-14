import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema, objectId } from "../../../utils/joiFactory.js";
import FryerOilLogModel from "./fryer-oil-log.model.js";

export const createFryerOilLogSchema = createSchema(FryerOilLogModel.schema);

export const updateFryerOilLogSchema = updateSchema(
  FryerOilLogModel.schema,
  ["updatedBy"],
);

export const paramsFryerOilLogSchema = paramsSchema();

export const paramsFryerOilLogIdsSchema = paramsIdsSchema();

export const queryFryerOilLogSchema = querySchema();

export const installFryerOilLogSchema = Joi.object({
  quantityInstalled: Joi.number().positive().required(),
});

export const logQualityCheckFryerOilLogSchema = Joi.object({
  qualityRating: Joi.string().valid("Good", "Fair", "Poor", "Unacceptable").required(),
  notes: Joi.string().trim().max(300).optional(),
  incrementCycle: Joi.boolean().optional(),
});

export const discardFryerOilLogSchema = Joi.object({
  discardReason: Joi.string().valid("ScheduledChange", "QualityDegraded", "Contaminated", "Other").required(),
  wasteRecordId: objectId().optional(),
});

export const transitionFryerOilLogSchema = Joi.object({
  status: Joi.string().valid("Cancelled").required(),
});
