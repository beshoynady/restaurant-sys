import InventoryCountModel from "./inventory-count.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for inventory-count model
const inventoryCountService = new AdvancedService(InventoryCountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","warehouse","createdBy","approvedBy","executedBy","adjustmentDocument","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default inventoryCountService;
