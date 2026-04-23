import AssetDepreciationModel from "../../models/assets/asset-depreciation.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for asset-depreciation model
const assetDepreciationService = new AdvancedService(AssetDepreciationModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["Brand","Branch","asset","journalEntryId","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetDepreciationService;
