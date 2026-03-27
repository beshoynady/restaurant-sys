import StockLedgerModel from "../../models/inventory/stock-ledger.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for stock-ledger model
const stockLedgerService = new AdvancedCrudService(StockLedgerModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","warehouse","stockItem","documentId","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default stockLedgerService;
