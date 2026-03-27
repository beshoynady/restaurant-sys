import PayrollModel from "../../models/employees/payroll.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for payroll model
const payrollService = new AdvancedCrudService(PayrollModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","createdBy","updatedBy","calculatedBy","approvedBy","paidBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default payrollService;
