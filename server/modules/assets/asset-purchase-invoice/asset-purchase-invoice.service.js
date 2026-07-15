import AssetPurchaseInvoiceModel from "./asset-purchase-invoice.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for asset-purchase-invoice model
const assetPurchaseInvoiceService = new AdvancedService(AssetPurchaseInvoiceModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document,
  // already has Draft/Posted/Cancelled — see asset.service.js.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","supplier","taxes","createdBy","updatedBy","postedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetPurchaseInvoiceService;
