import StockItemModel from "../../models/inventory/stock-item.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for stock-item model
const stockItemService = new AdvancedCrudService(StockItemModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","categoryId","inventoryAccount","expenseAccount","cogsAccount","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default stockItemService;
