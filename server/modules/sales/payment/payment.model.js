// Payment Model — ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1.
// Records what a customer actually tendered against an Invoice. A first-class aggregate root
// (ADR-001 §5 Option B), not embedded on Invoice and not a nested action — an invoice can receive
// multiple payments over time (partial payments), each an independent, immutable event.
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const PaymentSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    invoice: { type: ObjectId, ref: "Invoice", required: true, index: true },

    // Nullable: a payment can be recorded outside an active cashier-shift context (e.g. a
    // back-office reconciliation entry for a delayed card settlement).
    cashierShift: { type: ObjectId, ref: "CashierShift", default: null },

    // Split-tender support (the intent Invoice.paymentMethod[] always had but never enforced —
    // ADR-001 P9): one or more methods summing to totalAmount, each independently traceable to the
    // CashTransaction it produced.
    tenders: {
      type: [
        {
          paymentMethod: { type: ObjectId, ref: "PaymentMethod", required: true },
          amount: { type: Number, required: true, min: 0 },
          currency: { type: String, uppercase: true, trim: true, default: null },
          reference: { type: String, trim: true, maxlength: 200, default: null },
          // Optional: which specific POS drawer/safe this tender was settled through — resolves to
          // a more accurate GL cash account than the brand's generic controlAccounts.cash when
          // supplied (see payment.service.js#_resolveCashAccount).
          cashRegister: { type: ObjectId, ref: "CashRegister", default: null },
        },
      ],
      validate: {
        validator: (tenders) => Array.isArray(tenders) && tenders.length > 0,
        message: "At least one tender is required to record a payment.",
      },
      required: true,
    },

    // Materialized sum of tenders[].amount — stored (not purely derived) for the same
    // query-performance + established-precedent reasons as Invoice.amountPaid/balanceDue (ADR-001
    // §7). Set once in payment.service.js#beforeCreate, never independently client-settable
    // (locked in payment.repository.js).
    totalAmount: { type: Number, required: true, min: 0 },

    // Voiding is out of scope for Phase 1 (ADR-001 §9) — this enum exists so the field has a real
    // home when that phase lands, without a later schema migration; only "RECORDED" is ever set by
    // this phase's code.
    status: { type: String, enum: ["RECORDED", "VOIDED"], default: "RECORDED", index: true },

    // Closes ADR-001 §18's idempotency requirement (G7) the same way every other document-number
    // uniqueness constraint in this codebase works: a compound unique index, not a bespoke
    // header-based mechanism. Sparse — only enforced when a caller actually supplies a key.
    // ADR-001 Phase 2 correction: no `default: null` (a pre-existing defect fixed here, found while
    // building the sibling SalesReturn aggregate) — Mongoose would store an explicit `null` on
    // every no-key document, which a sparse index does NOT skip (sparse only omits genuinely
    // ABSENT fields), so two no-key payments against the same invoice would collide on this unique
    // index. Omitting the field entirely when absent is what makes "sparse" actually work.
    idempotencyKey: { type: String, trim: true },

    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    // One per tender — "cashTransaction" (lower-case c) matches the model's own registered name
    // exactly (finance/cash-transaction/cash-transaction.model.js).
    cashTransactions: [{ type: ObjectId, ref: "cashTransaction" }],

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// Tenant-scoping + dominant query shape (list payments for an invoice, newest first).
PaymentSchema.index({ brand: 1, branch: 1, invoice: 1, createdAt: -1 });
// Idempotent-replay guard. ADR-001 Phase 2 correction: `partialFilterExpression`, not `sparse` —
// a real, verified difference for a COMPOUND index. MongoDB's sparse flag only skips a document
// from a compound index when EVERY indexed field is absent; since `brand`/`invoice` are always
// present here, a plain `sparse: true` still indexes every no-key payment and two no-key payments
// against the same invoice collide (found and fixed while building the sibling SalesReturn
// aggregate, which hit this for real). A partial index with an explicit filter is the documented,
// correct mechanism for "unique only when this specific field exists."
PaymentSchema.index(
  { brand: 1, invoice: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } },
);

const PaymentModel = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export default PaymentModel;
