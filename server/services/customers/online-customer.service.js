import OnlineCustomerModel from "../../models/customers/online-customer.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for online-customer model
const onlineCustomerService = new AdvancedService(OnlineCustomerModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","verifiedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default onlineCustomerService;
