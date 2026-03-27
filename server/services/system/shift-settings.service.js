import ShiftSettingsModel from "../../models/system/shift-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for shift-settings model
const shiftSettingsService = new AdvancedCrudService(ShiftSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default shiftSettingsService;
