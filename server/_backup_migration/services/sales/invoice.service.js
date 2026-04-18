import InvoiceModel from "../../models/sales/invoice.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for invoice model
const invoiceService = new AdvancedService(InvoiceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","cashierShift","cashier","deliveryMan","order","paidBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default invoiceService;
