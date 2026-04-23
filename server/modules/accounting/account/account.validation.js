import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import AccountModel from "./account.model.js";

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
export const paramsAccountSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsAccountIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryAccountSchema = querySchema();