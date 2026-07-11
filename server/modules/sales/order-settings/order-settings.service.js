import OrderSettingsModel from "./order-settings.model.js";
import AdvancedService from "../../../utils/BaseService.js";

// Initialize service for order-settings model
const orderSettingsService = new AdvancedService(OrderSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default orderSettingsService;
