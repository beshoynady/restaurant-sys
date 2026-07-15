import AssetTransactionsModel from "./asset-transactions.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for asset-transactions model
const assetTransactionsService = new AdvancedService(AssetTransactionsModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: AssetTransaction is an
  // immutable audit log by design (see the model's own findOneAndUpdate/
  // updateOne guard) — soft-delete is the clearest case of this option
  // being blindly applied where it doesn't belong at all.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","asset","createdBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetTransactionsService;
