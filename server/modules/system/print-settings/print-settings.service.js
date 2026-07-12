import PrintSettingsModel from "./print-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for print-settings model
const printSettingsService = new AdvancedService(PrintSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["branch"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default printSettingsService;
