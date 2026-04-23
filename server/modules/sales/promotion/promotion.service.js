import PromotionModel from "./promotion.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for promotion model
const promotionService = new AdvancedService(PromotionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default promotionService;
