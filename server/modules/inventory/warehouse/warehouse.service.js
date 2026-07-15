import WarehouseModel from "./warehouse.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for warehouse model
const warehouseService = new AdvancedService(WarehouseModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default warehouseService;
