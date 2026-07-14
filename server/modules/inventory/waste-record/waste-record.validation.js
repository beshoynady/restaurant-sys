import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import WasteRecordModel from "./waste-record.model.js";

export const createWasteRecordSchema = createSchema(WasteRecordModel.schema);

export const updateWasteRecordSchema = updateSchema(
  WasteRecordModel.schema,
  ["updatedBy"],
);

export const paramsWasteRecordSchema = paramsSchema();

export const paramsWasteRecordIdsSchema = paramsIdsSchema();

export const queryWasteRecordSchema = querySchema();

export const transitionWasteRecordSchema = Joi.object({
  status: Joi.string().valid("Submitted", "Approved", "Rejected", "Cancelled").required(),
  rejectionReason: Joi.string().trim().max(300).optional(),
});
