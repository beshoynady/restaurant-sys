import NotificationSettingsModel from "./notification-settings.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for notification-settings model
const notificationSettingsService = new AdvancedService(NotificationSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default notificationSettingsService;
