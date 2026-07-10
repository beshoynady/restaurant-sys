import AuditLogModel from "../modules/audit-log/audit-log.model.js";
import { createAuditContextFromRequest } from "../utils/audit/AuditContext.js";
import { NextFunction, Request, Response } from "express";

/**
 * Audit Logger middleware.
 * - Listens to response "finish" event.
 * - Builds a context from the request (brand/branch/user/etc).
 * - Writes a record to AuditLogModel asynchronously.
 *
 * notes:
 * - We only log meaningful requests to avoid DB flood.
 * - Audit failures must NOT break the main request/response flow.
 */
export default function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("finish", async () => {
    try {
      const ctx = createAuditContextFromRequest(req);

      const event = "request";
      const resource = req.baseUrl
        ? req.baseUrl.replace(/^\/+/, "")
        : req.originalUrl || null;

      const method = req.method;
      const statusCode = res.statusCode;

      const shouldLog = method !== "GET" || statusCode >= 400 || ctx.brandId;
      if (!shouldLog) return;

      await AuditLogModel.create({
        brand: ctx.brandId,
        branch: ctx.branchId,
        user: ctx.userId,
        employee: ctx.employeeId,
        requestId: ctx.requestId,
        sessionId: ctx.sessionId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        event,
        resource,
        path: req.originalUrl || req.path || null,
        method,
        statusCode,
        metadata: {
          params: req.params,
          query: req.query,
        },
        isDeleted: false,
      });
    } catch (e: any) {
      // Prevent audit logging errors from affecting the main request.
      // eslint-disable-next-line no-console
      console.error("Audit logger failed:", e?.message || e);
    }
  });

  return next();
}
