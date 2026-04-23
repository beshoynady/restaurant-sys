import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import AccountBalanceModel from "./account-balance.model.js";

/* =========================
   Create Schema
========================= */
export const createAccountBalanceSchema = createSchema(AccountBalanceModel.schema);

/* =========================
   Update Schema
========================= */
export const updateAccountBalanceSchema = updateSchema(
  AccountBalanceModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsAccountBalanceSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAccountBalanceIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAccountBalanceSchema = querySchema();