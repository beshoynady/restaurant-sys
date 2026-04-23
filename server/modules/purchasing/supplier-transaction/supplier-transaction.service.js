import SupplierTransactionModel from "./supplier-transaction.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for supplier-transaction model
const supplierTransactionService = new AdvancedService(SupplierTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","supplier","paymentMethod","recordedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default supplierTransactionService;
