import WarehouseDocumentModel from "../../models/inventory/warehouse-document.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for warehouse-document model
const warehouseDocumentService = new AdvancedCrudService(WarehouseDocumentModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","sourceWarehouse","destinationWarehouse","journalEntry","createdBy","approvedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default warehouseDocumentService;
