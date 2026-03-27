import LoyaltyRewardModel from "../../models/loyalty/loyalty-reward.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for loyalty-reward model
const loyaltyRewardService = new AdvancedCrudService(LoyaltyRewardModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","product","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default loyaltyRewardService;
