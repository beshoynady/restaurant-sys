import AssetDepreciationModel from "./asset-depreciation.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for asset-depreciation model
const assetDepreciationService = new AdvancedService(AssetDepreciationModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document
  // (Draft/Posted, linked to a JournalEntry) — see asset.service.js.
  enableSoftDelete: false,
  // DB-012 minimal compatibility update: casing fixed to match the renamed `brand`/`branch`
  // fields (model previously had `Brand`/`Branch`, which meant `brandScoped: true` above was
  // silently never actually filtering/populating by brand at all).
  defaultPopulate: ["brand","branch","asset","journalEntryId","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetDepreciationService;
