import InventorySettingsModel from "./inventory-settings.model.js";
import AdvancedService from "../../../utils/BaseService.js";

// Initialize service for inventory-settings model
const inventorySettingsService = new AdvancedService(InventorySettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default inventorySettingsService;
