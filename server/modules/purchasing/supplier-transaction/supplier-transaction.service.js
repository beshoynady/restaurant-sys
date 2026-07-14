import SupplierTransactionModel from "./supplier-transaction.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

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

// V6.0 Production Hardening: Purchase/PurchaseReturn are each meant to happen exactly ONCE per
// source document (an invoice reaches Completed once; a return is approved once) — a second call
// with the same (brand, invoiceModel, reffrance, transactionType) is a duplicate call (a TOCTOU
// race, a client retry), not a second legitimate event, unlike Payment/Refund/AdvancePayment
// which are intentionally repeatable against the same invoice (partial payments).
const ONE_SHOT_TRANSACTION_TYPES = new Set(["Purchase", "PurchaseReturn"]);

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
   * V6.0 Production Hardening: `previousBalance`/`currentBalance`/`number` are read via plain
   * "most recent" lookups, not an atomic conditional update — but `{brand,branch,number}` already
   * carries a unique index (DB-003), so two truly-concurrent calls racing for the same `number`
   * collide there (E11000) instead of silently corrupting the balance chain. Retried with a fresh
   * read on collision — this is the standard optimistic-concurrency pattern (detect via a unique
   * constraint, retry with fresh state), not a new mechanism: every retry re-reads the *current*
   * previousBalance/number, so the chain self-heals rather than double-recording.
   */
  async record({ brand, branch, supplier, transactionType, amount, description, invoiceModel = null, reffrance = null, paymentMethod = null, recordedBy }) {
    const direction = DIRECTION_BY_TRANSACTION_TYPE[transactionType];

    if (ONE_SHOT_TRANSACTION_TYPES.has(transactionType) && reffrance) {
      const alreadyRecorded = await this.model.exists({ brand, invoiceModel, reffrance, transactionType });
      if (alreadyRecorded) {
        throwError(`A ${transactionType} transaction has already been recorded for this ${invoiceModel || "document"} — refusing to post a duplicate.`, 409);
      }
    }

    const MAX_ATTEMPTS = 5;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const lastTxn = await this.model.findOne({ brand, supplier }).sort({ createdAt: -1 }).select("currentBalance").lean();
      const previousBalance = lastTxn?.currentBalance ?? 0;
      const currentBalance = direction === "Credit" ? previousBalance + amount : previousBalance - amount;

      const lastNumbered = await this.model.findOne({ brand, branch }).sort({ number: -1 }).select("number").lean();
      const number = (lastNumbered?.number ?? 0) + 1;

      try {
        return await this.model.create({
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
      } catch (err) {
        const isDuplicateNumber = err?.code === 11000 && /number/.test(err?.message || "");
        if (!isDuplicateNumber || attempt === MAX_ATTEMPTS) throw err;
        // Another concurrent record() for this brand/branch (or this same supplier's chain) won
        // the race for `number` — retry with a fresh read, do not surface a spurious error to the
        // caller for what is a routine, expected race under concurrent load.
      }
    }
  }

  /** Current AP balance for a supplier — derived by reading the ledger, never independently stored. */
  async getCurrentBalance(brand, supplier) {
    const lastTxn = await this.model.findOne({ brand, supplier }).sort({ createdAt: -1 }).select("currentBalance").lean();
    return lastTxn?.currentBalance ?? 0;
  }
}

export default new SupplierTransactionService();
