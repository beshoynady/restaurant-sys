import AssetMaintenanceModel from "./asset-maintenance.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for asset-maintenance model
const assetMaintenanceService = new AdvancedService(AssetMaintenanceModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document,
  // already has Draft/Completed/Cancelled — see asset.service.js.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","asset","supplier","createdBy","approvedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetMaintenanceService;
