import {
  createSchema,
  updateSchema,
  paramsSchema,
  paramsIdsSchema,
  querySchema,
} from "../../utils/joiFactory.js";
import AuditLogModel from "./audit-log.model.js";

export const createAuditLogSchema = createSchema(AuditLogModel.schema);

export const updateAuditLogSchema = updateSchema(
  AuditLogModel.schema,
  ["deletedBy"],
);

export const paramsAuditLogSchema = paramsSchema();

export const paramsAuditLogIdsSchema = paramsIdsSchema();

export const queryAuditLogSchema = querySchema();
