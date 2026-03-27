import WarehouseModel from "../../models/inventory/warehouse.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for warehouse model
const warehouseService = new AdvancedCrudService(WarehouseModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default warehouseService;
