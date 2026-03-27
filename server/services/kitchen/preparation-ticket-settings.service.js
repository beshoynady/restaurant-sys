import PreparationTicketSettingsModel from "../../models/kitchen/preparation-ticket-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for preparation-ticket-settings model
const preparationTicketSettingsService = new AdvancedCrudService(PreparationTicketSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationTicketSettingsService;
