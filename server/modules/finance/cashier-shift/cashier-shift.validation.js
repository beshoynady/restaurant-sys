import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import CashierShiftModel from "./cashier-shift.model.js";

/* =========================
   Create Schema
========================= */
export const createCashierShiftSchema = createSchema(CashierShiftModel.schema);

/* =========================
   Update Schema
========================= */
export const updateCashierShiftSchema = updateSchema(
  CashierShiftModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsCashierShiftSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsCashierShiftIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryCashierShiftSchema = querySchema();