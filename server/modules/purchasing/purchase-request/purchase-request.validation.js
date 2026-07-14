import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PurchaseRequestModel from "./purchase-request.model.js";

export const createPurchaseRequestSchema = createSchema(PurchaseRequestModel.schema);
export const updatePurchaseRequestSchema = updateSchema(PurchaseRequestModel.schema, ["updatedBy"]);
export const paramsPurchaseRequestSchema = paramsSchema();
export const paramsPurchaseRequestIdsSchema = paramsIdsSchema();
export const queryPurchaseRequestSchema = querySchema();

export const transitionPurchaseRequestSchema = Joi.object({
  status: Joi.string().valid("Draft", "Submitted", "Approved", "Rejected", "Cancelled", "Converted").required(),
  rejectionReason: Joi.string().trim().max(300).optional(),
});
