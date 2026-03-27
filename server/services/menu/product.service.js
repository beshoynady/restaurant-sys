import ProductModel from "../../models/menu/product.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for product model
const productService = new AdvancedCrudService(ProductModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","category","preparationSection","parentProduct","taxRate","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productService;
