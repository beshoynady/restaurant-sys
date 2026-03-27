import SupplierTransactionModel from "../../models/purchasing/supplier-transaction.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for supplier-transaction model
const supplierTransactionService = new AdvancedCrudService(SupplierTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","supplier","paymentMethod","recordedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default supplierTransactionService;
