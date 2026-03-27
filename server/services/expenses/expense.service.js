import ExpenseModel from "../../models/expenses/expense.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for expense model
const expenseService = new AdvancedCrudService(ExpenseModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","accountId","costCenter","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default expenseService;
