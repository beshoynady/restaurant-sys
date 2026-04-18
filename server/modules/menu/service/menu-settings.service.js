import MenuSettingsModel from "../../models/menu/menu-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for menu-settings model
const menuSettingsService = new AdvancedService(MenuSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default menuSettingsService;
