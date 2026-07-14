import Joi from "joi";
import { createSchema, updateSchema, paramsSchema, paramsIdsSchema, querySchema } from "../../../utils/joiFactory.js";
import PurchaseOrderModel from "./purchase-order.model.js";

export const createPurchaseOrderSchema = createSchema(PurchaseOrderModel.schema);
export const updatePurchaseOrderSchema = updateSchema(PurchaseOrderModel.schema, ["updatedBy"]);
export const paramsPurchaseOrderSchema = paramsSchema();
export const paramsPurchaseOrderIdsSchema = paramsIdsSchema();
export const queryPurchaseOrderSchema = querySchema();

export const transitionPurchaseOrderSchema = Joi.object({
  status: Joi.string()
    .valid("Draft", "Submitted", "Approved", "PartiallyReceived", "FullyReceived", "Closed", "Rejected", "Cancelled")
    .required(),
});
