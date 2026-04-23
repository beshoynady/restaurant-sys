import CashTransferModel from "../../models/cash/cash-transfer.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for cash-transfer model
const cashTransferService = new AdvancedService(CashTransferModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","fromCashRegister","fromBankAccount","toCashRegister","toBankAccount","createdBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashTransferService;
