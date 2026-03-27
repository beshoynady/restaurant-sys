import PreparationTicketModel from "../../models/kitchen/preparation-ticket.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for preparation-ticket model
const preparationTicketService = new AdvancedCrudService(PreparationTicketModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","order","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationTicketService;
