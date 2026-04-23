import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../../utils/joiFactory.js";
import UserAccountModel from "./user-account.model.js";

/* =========================
   Create Schema
========================= */
export const createUserAccountSchema = createSchema(UserAccountModel.schema);

/* =========================
   Update Schema
========================= */
export const updateUserAccountSchema = updateSchema(
  UserAccountModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsUserAccountSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsUserAccountIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryUserAccountSchema = querySchema();