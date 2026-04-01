import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import UserAccountModel from "../../models/employees/user-account.model.js";

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
export const userAccountParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const userAccountQuerySchema = querySchema();