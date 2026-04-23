import StockItemModel from "./stock-item.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for stock-item model
const stockItemService = new AdvancedService(StockItemModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","categoryId","inventoryAccount","expenseAccount","cogsAccount","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default stockItemService;
