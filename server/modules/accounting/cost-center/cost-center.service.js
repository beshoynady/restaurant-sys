import CostCenterModel from "./cost-center.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for cost-center model
const costCenterService = new AdvancedService(CostCenterModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","parent","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default costCenterService;
