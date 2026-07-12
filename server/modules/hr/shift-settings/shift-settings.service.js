import ShiftSettingsModel from "./shift-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for shift-settings model
const shiftSettingsService = new AdvancedService(ShiftSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default shiftSettingsService;
