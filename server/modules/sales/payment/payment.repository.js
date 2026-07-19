// Repository layer (BACKEND_FOUNDATION.md §4.3) — ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1.
// Owns 100% of Payment's own data access; payment.service.js (same directory) extends this class
// and contains the business orchestration (invoice balance draw-down, CashTransaction creation, GL
// posting) — matching the split already proven on accounting/journal-entry and sales/order.
import BaseRepository from "../../../utils/BaseRepository.js";
import PaymentModel from "./payment.model.js";

class PaymentRepository extends BaseRepository {
  constructor() {
    super(PaymentModel, {
      brandScoped: true,
      branchScoped: true,
      // Transactional, immutable event record — same reasoning as Invoice/PurchaseInvoice/
      // JournalEntry: soft-delete does not apply to a payment event.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "invoice", "cashierShift", "tenders.paymentMethod", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
      // Every field a payment event's own integrity depends on — stripped from every update()
      // payload, matching Invoice's lockedUpdateFields precedent exactly. There is no supported
      // update path for a Payment at all (see payment.router.js) — this is a second line of
      // defense, not the only one.
      lockedUpdateFields: ["invoice", "tenders", "totalAmount", "status", "journalEntry", "cashTransactions"],
    });
  }
}

export default PaymentRepository;
