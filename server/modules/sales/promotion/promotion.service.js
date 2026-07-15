import PromotionModel from "./promotion.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for promotion model
const promotionService = new AdvancedService(PromotionModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default promotionService;
