import PurchaseSettingsModel from "./purchase-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for purchase-settings model
const purchaseSettingsService = new AdvancedService(PurchaseSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default purchaseSettingsService;
