import CashTransactionModel from "../../models/cash/cash-transaction.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for cash-transaction model
const cashTransactionService = new AdvancedCrudService(CashTransactionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","cashRegister","bankAccount","paymentMethod","paymentChannel","relatedTransaction","orderId","invoiceId","supplierTransactionId","dailyExpenseId","createdBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashTransactionService;
