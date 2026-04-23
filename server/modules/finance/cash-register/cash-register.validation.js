import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import CashRegisterModel from "../../models/cash/cash-register.model.js";

/* =========================
   Create Schema
========================= */
export const createCashRegisterSchema = createSchema(CashRegisterModel.schema);

/* =========================
   Update Schema
========================= */
export const updateCashRegisterSchema = updateSchema(
  CashRegisterModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsCashRegisterSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsCashRegisterIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryCashRegisterSchema = querySchema();