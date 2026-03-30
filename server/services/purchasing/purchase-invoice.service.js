import PurchaseInvoiceModel from "../../models/purchasing/purchase-invoice.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for purchase-invoice model
const purchaseInvoiceService = new AdvancedService(PurchaseInvoiceModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","returnInvoice","supplier","warehouseForAllItems","taxes","costCenter","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default purchaseInvoiceService;
