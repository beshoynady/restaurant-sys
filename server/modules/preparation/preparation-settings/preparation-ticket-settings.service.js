import PreparationTicketSettingsModel from "./preparation-ticket-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for preparation-ticket-settings model
const preparationTicketSettingsService = new AdvancedService(PreparationTicketSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default preparationTicketSettingsService;
