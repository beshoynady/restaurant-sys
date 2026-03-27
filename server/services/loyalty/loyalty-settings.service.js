import LoyaltySettingsModel from "../../models/loyalty/loyalty-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for loyalty-settings model
const loyaltySettingsService = new AdvancedCrudService(LoyaltySettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default loyaltySettingsService;
