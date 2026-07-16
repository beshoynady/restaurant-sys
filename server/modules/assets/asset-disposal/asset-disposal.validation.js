import Joi from "joi";
import { objectId, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";

export const scrapAssetSchema = Joi.object({
  asset: objectId().required(),
  disposalDate: Joi.date().optional(),
  reason: Joi.string().trim().max(300).optional().allow(null, ""),
});

export const sellAssetSchema = Joi.object({
  asset: objectId().required(),
  disposalDate: Joi.date().optional(),
  saleProceeds: Joi.number().positive().required(),
  cashRegister: objectId().optional(),
  bankAccount: objectId().optional(),
  reason: Joi.string().trim().max(300).optional().allow(null, ""),
});

export const paramsAssetDisposalSchema = paramsSchema();
export const paramsAssetDisposalIdsSchema = paramsIdsSchema();
export const queryAssetDisposalSchema = querySchema();
