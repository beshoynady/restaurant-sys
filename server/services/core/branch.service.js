import BranchModel from "../../models/core/branch.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for branch model
const branchService = new AdvancedCrudService(BranchModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default branchService;
