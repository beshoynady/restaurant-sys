import AssetMaintenanceModel from "./asset-maintenance.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for asset-maintenance model
const assetMaintenanceService = new AdvancedService(AssetMaintenanceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","asset","supplier","createdBy","approvedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetMaintenanceService;
