import Joi from "joi";
import {
  objectId,
  createSchema,
  updateSchema,
  paramsSchema,
  querySchema,
} from "../../utils/joiFactory.js";
import AccountBalanceModel from "../../models/accounting/account-balance.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountBalanceSchema = createSchema(
  AccountBalanceModel.schema,
);

/* =========================
   Update Schema
========================= */
export const updateAccountBalanceSchema = updateSchema(
  AccountBalanceModel.schema,
  ["updatedBy"],
);

/* =========================
   Params Schema
========================= */
export const accountBalanceParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const accountBalanceQuerySchema = querySchema();
