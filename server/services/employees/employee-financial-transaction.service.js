import EmployeeFinancialTransactionModel from "../../models/employees/employee-financial-transaction.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for employee-financial-transaction model
const employeeFinancialTransactionService = new AdvancedCrudService(EmployeeFinancialTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["branch","employee","approvedBy","createdBy","updatedBy","cancelledBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeFinancialTransactionService;
