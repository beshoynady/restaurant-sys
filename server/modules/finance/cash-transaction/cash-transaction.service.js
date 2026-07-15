import CashTransactionModel from "./cash-transaction.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for cash-transaction model
const cashTransactionService = new AdvancedService(CashTransactionModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: a cash transaction is a
  // transactional financial document (DRAFT/POSTED/CANCELLED lifecycle),
  // not master data — soft-delete does not apply. `softDelete: true` above
  // was a silently-ignored typo (see account-balance.service.js); disabled
  // explicitly here.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","cashRegister","bankAccount","paymentMethod","paymentChannel","relatedTransaction","orderId","invoiceId","supplierTransactionId","dailyExpenseId","createdBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashTransactionService;
