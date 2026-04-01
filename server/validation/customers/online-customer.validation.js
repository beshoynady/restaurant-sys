import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import OnlineCustomerModel from "../../models/customers/online-customer.model.js";

/* =========================
   Create Schema
========================= */
export const createOnlineCustomerSchema = createSchema(OnlineCustomerModel.schema);

/* =========================
   Update Schema
========================= */
export const updateOnlineCustomerSchema = updateSchema(
  OnlineCustomerModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const onlineCustomerParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const onlineCustomerQuerySchema = querySchema();