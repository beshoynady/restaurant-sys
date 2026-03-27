import ServiceChargeModel from "../../models/system/service-charge.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for service-charge model
const serviceChargeService = new AdvancedCrudService(ServiceChargeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","account","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default serviceChargeService;
