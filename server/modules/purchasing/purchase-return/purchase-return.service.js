import PurchaseReturnModel from "./purchase-return.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for purchase-return model
const purchaseReturnService = new AdvancedService(PurchaseReturnModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","originalInvoice","warehouseForAllItems","supplier","taxes","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default purchaseReturnService;
