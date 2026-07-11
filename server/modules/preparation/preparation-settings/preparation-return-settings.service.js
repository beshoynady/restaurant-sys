import PreparationReturnSettingsModel from "./preparation-return-settings.model.js";
import AdvancedService from "../../../utils/BaseService.js";

// Initialize service for preparation-return-settings model
const preparationReturnSettingsService = new AdvancedService(PreparationReturnSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch", "preparationSection", "decisionBy", "createdBy", "updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default preparationReturnSettingsService;
