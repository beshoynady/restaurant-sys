import PreparationSectionModel from "./preparation-section.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Preparation & Kitchen Operations Platform: fixed the same silently-ignored option-name typo
// (softDelete/searchFields -> enableSoftDelete/searchableFields) already found and fixed on
// several sibling modules this engagement; also populate the newly-added department fields.
const preparationSectionService = new AdvancedService(PreparationSectionModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch", "warehouse", "parentDepartment", "assignedEmployees", "createdBy", "updatedBy", "deletedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default preparationSectionService;
