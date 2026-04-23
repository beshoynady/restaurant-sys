import WarehouseDocumentModel from "./warehouse-document.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for warehouse-document model
const warehouseDocumentService = new AdvancedService(WarehouseDocumentModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","sourceWarehouse","destinationWarehouse","journalEntry","createdBy","approvedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default warehouseDocumentService;
