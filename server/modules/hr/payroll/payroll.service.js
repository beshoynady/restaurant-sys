import PayrollModel from "./payroll.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for payroll model
const payrollService = new AdvancedService(PayrollModel, {
  brandScoped: true,
  // No `isDeleted` field on this model — `enableSoftDelete: true` (previously via a
  // silently-ignored `softDelete: true` typo) filtered every read to nothing. Disabled.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","employee","createdBy","updatedBy","calculatedBy","approvedBy","paidBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default payrollService;
