import PreparationSectionModel from "../../models/kitchen/preparation-section.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for preparation-section model
const preparationSectionService = new AdvancedCrudService(PreparationSectionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default preparationSectionService;
