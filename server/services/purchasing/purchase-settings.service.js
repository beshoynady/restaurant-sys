import PurchaseSettingsModel from "../../models/purchasing/purchase-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for purchase-settings model
const purchaseSettingsService = new AdvancedService(PurchaseSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default purchaseSettingsService;
