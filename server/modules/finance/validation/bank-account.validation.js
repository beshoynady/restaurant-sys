import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import BankAccountModel from "../../models/cash/bank-account.model.js";

/* =========================
   Create Schema
========================= */
export const createBankAccountSchema = createSchema(BankAccountModel.schema);

/* =========================
   Update Schema
========================= */
export const updateBankAccountSchema = updateSchema(
  BankAccountModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsBankAccountSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsBankAccountIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryBankAccountSchema = querySchema();