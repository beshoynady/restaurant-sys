import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import CashierShiftModel from "../../models/employees/cashier-shift.model.js";

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
export const cashierShiftParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const cashierShiftQuerySchema = querySchema();