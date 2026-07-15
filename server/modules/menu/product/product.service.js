import ProductModel from "./product.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for product model
const productService = new AdvancedService(ProductModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","category","preparationSection","parentProduct","taxRate","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productService;
