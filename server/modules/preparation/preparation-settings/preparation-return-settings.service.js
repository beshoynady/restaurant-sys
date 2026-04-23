import PreparationReturnSettingsModel from "./preparation-return-settings.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for preparation-return-settings model
const preparationReturnSettingsService = new AdvancedService(PreparationReturnSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","preparationSection","decisionBy","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationReturnSettingsService;
