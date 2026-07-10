import express from "express";
import auditLogController from "./audit-log.controller.js";
import authenticateToken from "../../middlewares/authenticate.js";
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
    validate(createAuditLogSchema),
    auditLogController.create,
  )
  .get(
    authenticateToken,
    validate(queryAuditLogSchema),
    auditLogController.getAll,
  );

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAuditLogSchema), auditLogController.getOne)
  .put(authenticateToken, validate(updateAuditLogSchema), auditLogController.update)
  .delete(authenticateToken, validate(paramsAuditLogSchema), auditLogController.hardDelete);

// Soft delete/restore
router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAuditLogSchema), auditLogController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAuditLogSchema), auditLogController.restore);

// Bulk hard delete
router.route("/bulk-delete")
  .delete(
    authenticateToken,
    validate(paramsAuditLogIdsSchema),
    auditLogController.bulkHardDelete,
  );

// Bulk soft delete
router.route("/bulk-soft-delete")
  .patch(
    authenticateToken,
    validate(paramsAuditLogIdsSchema),
    auditLogController.bulkSoftDelete,
  );

export default router;
