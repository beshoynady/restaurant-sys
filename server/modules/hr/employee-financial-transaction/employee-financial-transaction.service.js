import EmployeeFinancialTransactionModel from "./employee-financial-transaction.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for employee-financial-transaction model
const employeeFinancialTransactionService = new AdvancedService(EmployeeFinancialTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["branch","employee","approvedBy","createdBy","updatedBy","cancelledBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default employeeFinancialTransactionService;
