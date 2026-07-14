import SupplierTransactionModel from "./supplier-transaction.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Purchase/PurchaseReturn/Payment/Refund/AdvancePayment each move a supplier's balance in a known
// direction — the caller states WHAT happened (transactionType), this service decides which way
// the ledger moves, so that decision lives in exactly one place rather than being re-derived by
// every caller.
const DIRECTION_BY_TRANSACTION_TYPE = {
  OpeningBalance: "Credit",
  Purchase: "Credit", // increases what we owe the supplier
  PurchaseReturn: "Debit", // reduces what we owe
  Payment: "Debit", // reduces what we owe
  Refund: "Debit", // supplier owed us money back
  AdvancePayment: "Debit", // we paid before owing
};

class SupplierTransactionService extends AdvancedService {
  constructor() {
    super(SupplierTransactionModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-05, corrected: transactional document, already has
      // Pending/Approved/Completed/Cancelled — see asset.service.js.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "supplier", "paymentMethod", "recordedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * The single write path for the supplier AP subledger (SUPPLY_CHAIN_SSOT_MATRIX.md) — every
   * caller (PurchaseInvoice completion, PurchaseReturn approval, Supplier Payment recording)
   * states what happened, this method derives direction and the running balance, so the balance
   * chain can never be constructed incorrectly by a caller re-deriving the direction itself.
   *
   * Known, accepted limitation for this pass: `previousBalance`/`currentBalance` are read via a
   * plain "most recent transaction for this supplier" lookup, not an atomic conditional update —
   * a genuine read-then-write race exists if two transactions for the SAME supplier are recorded
   * truly concurrently (rare in practice — purchase invoices/payments are typically recorded
   * sequentially by one person). Flagged rather than silently accepted; the atomic-CAS pattern
   * already proven for Inventory/sequence numbering could close this gap in a later pass.
   */
  async record({ brand, branch, supplier, transactionType, amount, description, invoiceModel = null, reffrance = null, paymentMethod = null, recordedBy }) {
    const direction = DIRECTION_BY_TRANSACTION_TYPE[transactionType];

    const lastTxn = await this.model.findOne({ brand, supplier }).sort({ createdAt: -1 }).select("currentBalance").lean();
    const previousBalance = lastTxn?.currentBalance ?? 0;
    const currentBalance = direction === "Credit" ? previousBalance + amount : previousBalance - amount;

    const lastNumbered = await this.model.findOne({ brand, branch }).sort({ number: -1 }).select("number").lean();
    const number = (lastNumbered?.number ?? 0) + 1;

    return this.model.create({
      brand,
      branch,
      number,
      transactionDate: new Date(),
      description,
      supplier,
      invoiceModel,
      reffrance,
      transactionType,
      direction,
      previousBalance,
      amount,
      currentBalance,
      paymentMethod,
      recordedBy,
      status: "Completed",
    });
  }

  /** Current AP balance for a supplier — derived by reading the ledger, never independently stored. */
  async getCurrentBalance(brand, supplier) {
    const lastTxn = await this.model.findOne({ brand, supplier }).sort({ createdAt: -1 }).select("currentBalance").lean();
    return lastTxn?.currentBalance ?? 0;
  }
}

export default new SupplierTransactionService();
