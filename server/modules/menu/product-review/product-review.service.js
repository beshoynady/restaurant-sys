import ProductReviewModel from "./product-review.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for product-review model
const productReviewService = new AdvancedService(ProductReviewModel, {
  brandScoped: true,
  // No `isDeleted` field on this model — `enableSoftDelete: true` (previously via a
  // silently-ignored `softDelete: true` typo) filtered every read to nothing. Disabled.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","order","relatedSalesReturn","reviewedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productReviewService;
