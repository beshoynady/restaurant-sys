import AssetModel from "./asset.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for asset model
const assetService = new AdvancedService(AssetModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: Asset already has its own
  // full lifecycle status (Draft/Active/Suspended/Disposed/Sold) — that IS
  // the "proper business lifecycle" for removing an asset from active use;
  // soft-delete would be redundant with, and could conflict with, that
  // status field. `softDelete: true` was a silently-ignored typo anyway
  // (see account-balance.service.js); disabled explicitly.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","category","supplier","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetService;
