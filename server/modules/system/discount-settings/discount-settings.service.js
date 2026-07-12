import DiscountSettingsModel from "./discount-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for discount-settings model
const discountSettingsService = new AdvancedService(DiscountSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default discountSettingsService;
