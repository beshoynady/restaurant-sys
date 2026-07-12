import ServiceChargeModel from "./service-charge.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for service-charge model
const serviceChargeService = new AdvancedService(ServiceChargeModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","account","createdBy","updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default serviceChargeService;
