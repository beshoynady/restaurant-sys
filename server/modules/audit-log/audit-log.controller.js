import BaseController from "../../utils/BaseController.js";
import auditLogService from "./audit-log.service.js";

class AuditLogController extends BaseController {
  constructor() {
    super(auditLogService);
  }
}

export default new AuditLogController();
