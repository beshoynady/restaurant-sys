import WarehouseModel from "./warehouse.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for warehouse model
const warehouseService = new AdvancedService(WarehouseModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default warehouseService;
