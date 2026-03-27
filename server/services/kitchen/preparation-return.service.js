import PreparationReturnModel from "../../models/kitchen/preparation-return.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for preparation-return model
const preparationReturnService = new AdvancedCrudService(PreparationReturnModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","returnInvoice","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationReturnService;
