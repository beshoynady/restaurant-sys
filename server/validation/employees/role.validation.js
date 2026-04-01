import Joi from "joi";
import { objectId, createSchema, updateSchema, paramsSchema, querySchema } from "../../utils/joiFactory.js";
import RoleModel from "../../models/employees/role.model.js";

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
export const roleParamsSchema = paramsSchema();

/* =========================
   Query Schema
========================= */
export const roleQuerySchema = querySchema();