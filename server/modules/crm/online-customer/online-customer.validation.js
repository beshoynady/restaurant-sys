import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import OnlineCustomerModel from "./online-customer.model.js";

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
export const paramsOnlineCustomerSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsOnlineCustomerIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryOnlineCustomerSchema = querySchema();