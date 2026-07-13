import PurchaseInvoiceModel from "./purchase-invoice.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for purchase-invoice model
const purchaseInvoiceService = new AdvancedService(PurchaseInvoiceModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-05, corrected: transactional document,
  // already has Draft/Review/Approved/Completed/Rejected/Cancelled — see
  // asset.service.js for the general rationale.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","returnInvoice","supplier","warehouseForAllItems","taxes","costCenter","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default purchaseInvoiceService;
