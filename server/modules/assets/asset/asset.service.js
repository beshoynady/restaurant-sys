import AssetModel from "./asset.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for asset model
const assetService = new AdvancedService(AssetModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","category","supplier","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetService;
