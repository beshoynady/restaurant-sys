import BranchSettingsModel from "../../models/core/branch-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for branch-settings model
const branchSettingsService = new AdvancedService(BranchSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default branchSettingsService;
