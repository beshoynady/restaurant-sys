import CustomerLoyaltyModel from "../../models/loyalty/customer-loyalty.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for customer-loyalty model
const customerLoyaltyService = new AdvancedService(CustomerLoyaltyModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default customerLoyaltyService;
