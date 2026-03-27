import OrderSettingsModel from "../../models/sales/order-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for order-settings model
const orderSettingsService = new AdvancedCrudService(OrderSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default orderSettingsService;
