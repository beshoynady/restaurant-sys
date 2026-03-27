import AssetMaintenanceModel from "../../models/assets/asset-maintenance.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for asset-maintenance model
const assetMaintenanceService = new AdvancedCrudService(AssetMaintenanceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","asset","supplier","createdBy","approvedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetMaintenanceService;
