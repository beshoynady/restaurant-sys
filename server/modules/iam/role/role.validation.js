import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, paramsIdsSchema , querySchema } from "../../utils/joiFactory.js";
import RoleModel from "./role.model.js";

/* =========================
   Create Schema
========================= */
export const createRoleSchema = createSchema(RoleModel.schema);

/* =========================
   Update Schema
========================= */
export const updateRoleSchema = updateSchema(
  RoleModel.schema,
  ["updatedBy"]
);

/* =========================
   Params Schema
========================= */
export const paramsRoleSchema = paramsSchema();

/* =========================
   Params Ids Schema
========================= */
export const paramsRoleIdsSchema = paramsIdsSchema();


/* =========================
   Query Schema
========================= */
export const queryRoleSchema = querySchema();