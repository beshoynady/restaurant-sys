import StockTransferRequestModel from "../../models/inventory/stock-transfer-request.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for stock-transfer-request model
const stockTransferRequestService = new AdvancedCrudService(StockTransferRequestModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","fromWarehouse","toWarehouse","requestedBy","approvedBy","rejectedBy","executedBy","outDocument","inDocument","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default stockTransferRequestService;
