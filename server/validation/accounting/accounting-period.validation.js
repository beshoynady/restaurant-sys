import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import AccountingPeriodModel from "../../models/accounting/accounting-period.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountingPeriodSchema = createSchema(AccountingPeriodModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAccountingPeriodSchema = updateSchema(
  AccountingPeriodModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsAccountingPeriodSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAccountingPeriodIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAccountingPeriodSchema = querySchema();