import ExpenseModel from "./expense.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for expense model
const expenseService = new AdvancedService(ExpenseModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","accountId","costCenter","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default expenseService;
