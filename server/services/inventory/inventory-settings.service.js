import InventorySettingsModel from "../../models/inventory/inventory-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for inventory-settings model
const inventorySettingsService = new AdvancedCrudService(InventorySettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default inventorySettingsService;
