import ServiceChargeModel from "./service-charge.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for service-charge model
const serviceChargeService = new AdvancedService(ServiceChargeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","account","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default serviceChargeService;
