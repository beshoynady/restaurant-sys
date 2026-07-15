import ExpenseModel from "./expense.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for expense model
const expenseService = new AdvancedService(ExpenseModel, {
  brandScoped: true,
  // No `isDeleted` field on this model — `enableSoftDelete: true` (previously via a
  // silently-ignored `softDelete: true` typo) filtered every read to nothing. Disabled.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","accountId","costCenter","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default expenseService;
