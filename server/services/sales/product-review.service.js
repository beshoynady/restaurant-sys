import ProductReviewModel from "../../models/sales/product-review.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for product-review model
const productReviewService = new AdvancedCrudService(ProductReviewModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","order","relatedSalesReturn","reviewedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productReviewService;
