import express from "express";
import auditLogController from "./audit-log.controller.js";
import authenticateToken from "../../middlewares/authenticate.js";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";
import {
  createAuditLogSchema,
  updateAuditLogSchema,
  paramsAuditLogSchema,
  paramsAuditLogIdsSchema,
  queryAuditLogSchema,
} from "./audit-log.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(
    authenticateToken,
    authorize("AuditLogs", "create"),
    validate(createAuditLogSchema),
    auditLogController.create,
  )
  .get(
    authenticateToken,
    authorize("AuditLogs", "read"),
    validate(queryAuditLogSchema),
    auditLogController.getAll,
  );

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AuditLogs", "read"), validate(paramsAuditLogSchema, "params"), auditLogController.getOne)
  .put(authenticateToken,
    authorize("AuditLogs", "update"), validate(updateAuditLogSchema), auditLogController.update)
  .delete(authenticateToken,
    authorize("AuditLogs", "delete"), validate(paramsAuditLogSchema, "params"), auditLogController.hardDelete);

// Soft delete/restore
router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AuditLogs", "delete"), validate(paramsAuditLogSchema, "params"), auditLogController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AuditLogs", "update"), validate(paramsAuditLogSchema, "params"), auditLogController.restore);

// Bulk hard delete
router.route("/bulk-delete")
  .delete(
    authenticateToken,
    authorize("AuditLogs", "delete"),
    validate(paramsAuditLogIdsSchema),
    auditLogController.bulkHardDelete,
  );

// Bulk soft delete
router.route("/bulk-soft-delete")
  .patch(
    authenticateToken,
    authorize("AuditLogs", "delete"),
    validate(paramsAuditLogIdsSchema),
    auditLogController.bulkSoftDelete,
  );

export default router;
