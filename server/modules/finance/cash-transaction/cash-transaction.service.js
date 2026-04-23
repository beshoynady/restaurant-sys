import CashTransactionModel from "./cash-transaction.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for cash-transaction model
const cashTransactionService = new AdvancedService(CashTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","cashRegister","bankAccount","paymentMethod","paymentChannel","relatedTransaction","orderId","invoiceId","supplierTransactionId","dailyExpenseId","createdBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashTransactionService;
