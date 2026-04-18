import SalesReturnModel from "../../models/sales/sales-return.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for sales-return model
const salesReturnService = new AdvancedService(SalesReturnModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","originalInvoice","order","cashierShift","paidBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default salesReturnService;
