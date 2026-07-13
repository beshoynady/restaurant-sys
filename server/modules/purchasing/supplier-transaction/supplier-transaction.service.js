import SupplierTransactionModel from "./supplier-transaction.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for supplier-transaction model
const supplierTransactionService = new AdvancedService(SupplierTransactionModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-05, corrected: transactional document,
  // already has Pending/Approved/Completed/Cancelled — see
  // asset.service.js.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","supplier","paymentMethod","recordedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default supplierTransactionService;
