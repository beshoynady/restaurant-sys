import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import CustomerLoyaltyModel from "../../models/loyalty/customer-loyalty.model.js";

/* =========================
   Create Schema
========================= */
export const createCustomerLoyaltySchema = createSchema(CustomerLoyaltyModel.schema);

/* =========================
   Update Schema
========================= */
export const updateCustomerLoyaltySchema = updateSchema(
  CustomerLoyaltyModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsCustomerLoyaltySchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsCustomerLoyaltyIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryCustomerLoyaltySchema = querySchema();