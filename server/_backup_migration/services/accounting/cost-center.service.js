import CostCenterModel from "../../models/accounting/cost-center.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for cost-center model
const costCenterService = new AdvancedService(CostCenterModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","parent","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default costCenterService;
