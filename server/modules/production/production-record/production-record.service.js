import ProductionRecordModel from "./production-record.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Enterprise Production Platform: fixed the same silently-ignored option-name typo
// (softDelete/searchFields -> enableSoftDelete/searchableFields) already found and fixed on
// several sibling modules this engagement. Read-mostly service — records are created internally
// by ProductionOrderService.complete(), not via this service's own `create()` from an API caller
// (mirrors StockLedger's relationship to WarehouseDocument).
const productionRecordService = new AdvancedService(ProductionRecordModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: false, // immutable execution log, matches StockLedger's convention
  defaultPopulate: ["brand", "branch", "productionOrder", "warehouse", "stockItem", "preparationSection", "productionRecipe", "materialsUsed.material", "createdBy", "updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default productionRecordService;
