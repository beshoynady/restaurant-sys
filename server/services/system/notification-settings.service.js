import NotificationSettingsModel from "../../models/system/notification-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for notification-settings model
const notificationSettingsService = new AdvancedCrudService(NotificationSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default notificationSettingsService;
