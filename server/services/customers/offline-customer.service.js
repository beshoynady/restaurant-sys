import OfflineCustomerModel from "../../models/customers/offline-customer.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for offline-customer model
const offlineCustomerService = new AdvancedCrudService(OfflineCustomerModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default offlineCustomerService;
