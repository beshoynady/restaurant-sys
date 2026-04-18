import PreparationSectionModel from "../../models/kitchen/preparation-section.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for preparation-section model
const preparationSectionService = new AdvancedService(PreparationSectionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationSectionService;
