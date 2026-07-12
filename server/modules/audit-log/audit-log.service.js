import AuditLogModel from "./audit-log.model.js";
import AdvancedService from "../../utils/BaseRepository.js";

const auditLogService = new AdvancedService(AuditLogModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultSort: { createdAt: -1 },
  searchableFields: ["event", "resource", "path", "method"],
  defaultPopulate: [],
});

export default auditLogService;
