import SalesReturnSettingsModel from "./sales-return-settings.model.js";
import AdvancedService from "../../../utils/BaseService.js";

// Initialize service for sales-return-settings model
const salesReturnSettingsService = new AdvancedService(SalesReturnSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","decisionBy","createdBy","updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default salesReturnSettingsService;
