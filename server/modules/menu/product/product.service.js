import ProductModel from "./product.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for product model
const productService = new AdvancedService(ProductModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","category","preparationSection","parentProduct","taxRate","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productService;
