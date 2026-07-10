import AuditLogModel from "../modules/audit-log/audit-log.model.js";

import { createAuditContextFromRequest } from "../utils/audit/AuditContext.js";

export default function auditLogger(req, res, next) {
  res.on("finish", async () => {
    try {
      // حاول التقاط context من request/user
      const ctx = createAuditContextFromRequest(req);

      // تجميع basic info
      const event = "request";
      const resource = req.baseUrl
        ? req.baseUrl.replace(/^\/+/, "")
        : req.originalUrl || null;

      // لا نريد flood: سجل فقط لأوامر الكتابة أو errors
      const method = req.method;
      const statusCode = res.statusCode;

      const shouldLog =
        method !== "GET" || statusCode >= 400 || ctx.brandId;

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
    } catch (e) {
      // منع تأثير Audit على الطلب الأساسي
      // eslint-disable-next-line no-console
      console.error("Audit logger failed:", e?.message || e);
    }
  });

  return next();
}
