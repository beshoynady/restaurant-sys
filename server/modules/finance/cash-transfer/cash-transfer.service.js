import CashTransferModel from "./cash-transfer.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for cash-transfer model
const cashTransferService = new AdvancedService(CashTransferModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document
  // (DRAFT/POSTED/CANCELLED lifecycle) — see cash-transaction.service.js.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","fromCashRegister","fromBankAccount","toCashRegister","toBankAccount","createdBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashTransferService;
