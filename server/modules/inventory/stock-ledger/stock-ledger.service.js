import StockLedgerModel from "./stock-ledger.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for stock-ledger model
const stockLedgerService = new AdvancedService(StockLedgerModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","warehouse","stockItem","documentId","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default stockLedgerService;
