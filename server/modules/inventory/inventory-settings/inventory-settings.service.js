import InventorySettingsModel from "../../models/inventory/inventory-settings.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for inventory-settings model
const inventorySettingsService = new AdvancedService(InventorySettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default inventorySettingsService;
