import AssetPurchaseInvoiceModel from "../../models/assets/asset-purchase-invoice.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for asset-purchase-invoice model
const assetPurchaseInvoiceService = new AdvancedService(AssetPurchaseInvoiceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","supplier","taxes","createdBy","updatedBy","postedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetPurchaseInvoiceService;
