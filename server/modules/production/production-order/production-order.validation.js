import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import ProductionOrderModel from "./production-order.model.js";

/* =========================
   Create Schema
========================= */
export const createProductionOrderSchema = createSchema(ProductionOrderModel.schema);

/* =========================
   Update Schema
========================= */
export const updateProductionOrderSchema = updateSchema(
  ProductionOrderModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsProductionOrderSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsProductionOrderIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryProductionOrderSchema = querySchema();

export const transitionProductionOrderSchema = Joi.object({
  status: Joi.string().valid("Submitted", "Approved", "Rejected", "Cancelled", "Closed").required(),
  rejectionReason: Joi.string().trim().max(300).optional(),
});

export const completeProductionOrderSchema = Joi.object({
  actualYieldQuantity: Joi.number().positive().required(),
  operationCosts: Joi.array().items(Joi.object({
    operationType: Joi.string().valid("Labor", "Machine", "Overhead", "Gas", "Electricity", "Other").required(),
    cost: Joi.number().min(0).required(),
    allocationMethod: Joi.string().valid("Fixed", "Variable", "Activity-Based").required(),
  })).optional(),
});