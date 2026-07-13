import PurchaseReturnModel from "./purchase-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for purchase-return model
const purchaseReturnService = new AdvancedService(PurchaseReturnModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-05, corrected: transactional document,
  // already has Draft/Review/Partially Refunded/Fully Refunded/Rejected/
  // Cancelled — see asset.service.js.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","originalInvoice","warehouseForAllItems","supplier","taxes","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default purchaseReturnService;
