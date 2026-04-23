import DailyExpenseModel from "./daily-expense.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for daily-expense model
const dailyExpenseService = new AdvancedService(DailyExpenseModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","expense","costCenter","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default dailyExpenseService;
