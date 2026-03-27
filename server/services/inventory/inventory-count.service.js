import InventoryCountModel from "../../models/inventory/inventory-count.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for inventory-count model
const inventoryCountService = new AdvancedCrudService(InventoryCountModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","warehouse","createdBy","approvedBy","executedBy","adjustmentDocument","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default inventoryCountService;
