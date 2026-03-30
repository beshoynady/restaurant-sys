import DiscountSettingsModel from "../../models/system/discount-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for discount-settings model
const discountSettingsService = new AdvancedService(DiscountSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default discountSettingsService;
