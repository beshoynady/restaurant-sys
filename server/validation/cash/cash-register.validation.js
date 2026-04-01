import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const cashRegisterParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const cashRegisterQuerySchema = querySchema();