import PrintSettingsModel from "../../models/system/print-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for print-settings model
const printSettingsService = new AdvancedService(PrintSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["branch"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default printSettingsService;
