import PreparationTicketSettingsModel from "./preparation-ticket-settings.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for preparation-ticket-settings model
const preparationTicketSettingsService = new AdvancedService(PreparationTicketSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationTicketSettingsService;
