import AssetModel from "../../models/assets/asset.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for asset model
const assetService = new AdvancedCrudService(AssetModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","category","supplier","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetService;
