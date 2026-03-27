import EmployeeFinancialModel from "../../models/employees/employee-financial.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for employee-financial model
const employeeFinancialService = new AdvancedCrudService(EmployeeFinancialModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","paymentMethod","tax","insurance","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeFinancialService;
