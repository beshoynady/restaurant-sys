import AssetDepreciationModel from "./asset-depreciation.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for asset-depreciation model
const assetDepreciationService = new AdvancedService(AssetDepreciationModel, {
  brandScoped: true,
  softDelete: true,
  // DB-012 minimal compatibility update: casing fixed to match the renamed `brand`/`branch`
  // fields (model previously had `Brand`/`Branch`, which meant `brandScoped: true` above was
  // silently never actually filtering/populating by brand at all).
  defaultPopulate: ["brand","branch","asset","journalEntryId","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetDepreciationService;
