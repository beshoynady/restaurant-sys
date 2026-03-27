import OnlineCustomerModel from "../../models/customers/online-customer.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for online-customer model
const onlineCustomerService = new AdvancedCrudService(OnlineCustomerModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","verifiedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default onlineCustomerService;
