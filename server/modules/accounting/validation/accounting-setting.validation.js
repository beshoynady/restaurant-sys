import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
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
export const paramsAccountingSettingSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAccountingSettingIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAccountingSettingSchema = querySchema();