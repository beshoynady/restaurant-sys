import BrandModel from "../../models/core/brand.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for brand model
const brandService = new AdvancedCrudService(BrandModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default brandService;
