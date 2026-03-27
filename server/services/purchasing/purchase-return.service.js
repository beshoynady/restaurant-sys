import PurchaseReturnModel from "../../models/purchasing/purchase-return.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for purchase-return model
const purchaseReturnService = new AdvancedCrudService(PurchaseReturnModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","originalInvoice","warehouseForAllItems","supplier","taxes","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default purchaseReturnService;
