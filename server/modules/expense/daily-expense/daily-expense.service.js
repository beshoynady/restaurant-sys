import DailyExpenseModel from "./daily-expense.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for daily-expense model
const dailyExpenseService = new AdvancedService(DailyExpenseModel, {
  brandScoped: true,
  // No `isDeleted` field on this model — `enableSoftDelete: true` (previously via a
  // silently-ignored `softDelete: true` typo) filtered every read to nothing. Disabled.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","expense","costCenter","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default dailyExpenseService;
