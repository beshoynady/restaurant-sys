import EmployeeFinancialModel from "../../models/employees/employee-financial.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for employee-financial model
const employeeFinancialService = new AdvancedService(EmployeeFinancialModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","paymentMethod","tax","insurance","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeFinancialService;
