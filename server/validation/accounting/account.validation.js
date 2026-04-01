import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import AccountModel from "../../models/accounting/account.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountSchema = createSchema(AccountModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAccountSchema = updateSchema(
  AccountModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const accountParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const accountQuerySchema = querySchema();