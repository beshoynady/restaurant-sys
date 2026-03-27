import LoyaltyTransactionModel from "../../models/loyalty/loyalty-transaction.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for loyalty-transaction model
const loyaltyTransactionService = new AdvancedCrudService(LoyaltyTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","customerLoyalty","reward","order","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default loyaltyTransactionService;
