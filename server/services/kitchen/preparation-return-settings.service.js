import PreparationReturnSettingsModel from "../../models/kitchen/preparation-return-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for preparation-return-settings model
const preparationReturnSettingsService = new AdvancedCrudService(PreparationReturnSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","preparationSection","decisionBy","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationReturnSettingsService;
