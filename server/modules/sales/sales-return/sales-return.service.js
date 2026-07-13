import SalesReturnModel from "./sales-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for sales-return model
const salesReturnService = new AdvancedService(SalesReturnModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-13, corrected: transactional document,
  // refundStatus now includes CANCELLED — see asset.service.js for the
  // general rationale.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","originalInvoice","order","cashierShift","paidBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default salesReturnService;
