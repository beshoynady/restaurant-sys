import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AccountingSettingModel from "../../models/accounting/accounting-setting.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountingSettingSchema = createSchema(AccountingSettingModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAccountingSettingSchema = updateSchema(
  AccountingSettingModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const accountingSettingParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const accountingSettingQuerySchema = querySchema();