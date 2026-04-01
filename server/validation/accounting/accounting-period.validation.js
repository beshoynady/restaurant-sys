import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
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
export const accountingPeriodParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const accountingPeriodQuerySchema = querySchema();