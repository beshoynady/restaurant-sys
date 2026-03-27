import SalesReturnModel from "../../models/sales/sales-return.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for sales-return model
const salesReturnService = new AdvancedCrudService(SalesReturnModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","originalInvoice","order","cashierShift","paidBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default salesReturnService;
