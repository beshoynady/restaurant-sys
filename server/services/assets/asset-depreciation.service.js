import AssetDepreciationModel from "../../models/assets/asset-depreciation.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for asset-depreciation model
const assetDepreciationService = new AdvancedCrudService(AssetDepreciationModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["Brand","Branch","asset","journalEntryId","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetDepreciationService;
