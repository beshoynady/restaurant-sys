import ShiftSettingsModel from "../../models/system/shift-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for shift-settings model
const shiftSettingsService = new AdvancedService(ShiftSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default shiftSettingsService;
