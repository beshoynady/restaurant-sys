import PreparationTicketModel from "./preparation-ticket.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for preparation-ticket model
const preparationTicketService = new AdvancedService(PreparationTicketModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","order","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationTicketService;
