import PromotionModel from "../../models/sales/promotion.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for promotion model
const promotionService = new AdvancedCrudService(PromotionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default promotionService;
