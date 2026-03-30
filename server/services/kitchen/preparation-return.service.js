import PreparationReturnModel from "../../models/kitchen/preparation-return.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for preparation-return model
const preparationReturnService = new AdvancedService(PreparationReturnModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","returnInvoice","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationReturnService;
