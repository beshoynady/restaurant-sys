import PayrollModel from "./payroll.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for payroll model
const payrollService = new AdvancedService(PayrollModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","createdBy","updatedBy","calculatedBy","approvedBy","paidBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default payrollService;
