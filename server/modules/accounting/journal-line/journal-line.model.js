// DATABASE_IMPLEMENTATION_PLAN.md DB-008 (DATABASE_ARCHITECTURE_REDESIGN.md, Problem 2):
// rebuilds the structural defect at the center of the accounting review —
// this collection was previously declared with `{ _id: false }` (an option
// meant for embedded subdocuments) while being registered as a standalone
// top-level Mongoose model, and had no back-reference to its parent
// JournalEntry at all. Fixed here: a real `_id`, a mandatory `journalEntry`
// reference, `period`/`date` denormalized for reporting-query performance
// (matching the access pattern real ledger/trial-balance reports use —
// "every line for account X in period Y" — which needs an indexed,
// line-centric query path, not an aggregation across every JournalEntry
// document), and a debit-XOR-credit validator (a line must have exactly
// one of debit/credit set, never both, never neither).
import mongoose from "mongoose";
const { Schema } = mongoose;

const journalLineSchema = new Schema(
  {
    // DB-008: the previously-missing back-reference — the primary traversal path from a line to its entry.
    journalEntry: { type: Schema.Types.ObjectId, ref: "JournalEntry", required: true, index: true },

    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    // DB-008: denormalized from the parent entry so ledger/trial-balance reports can query
    // JournalLine directly by {account, brand, branch, period} without joining back to JournalEntry.
    period: { type: Schema.Types.ObjectId, ref: "AccountingPeriod", required: true },
    date: { type: Date, required: true },

    description: { type: String, trim: true, required: true, maxlength: 300 },

    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },

    sourceType: {
      type: String,
      enum: [
        "PAYROLL_RUN",
        "SALES_INVOICE",
        "PURCHASE_INVOICE",
        "SALES_RETURN",
        "PURCHASE_RETURN",
        "EXPENSE_VOUCHER",
        "ASSET_DOCUMENT",
        "CASH_MOVEMENT",
        "MANUAL_ENTRY",
        // Supply Chain & Commerce Platform V5.1 — additive, same convention as every other entry
        // in this enum (each represents a posting engine's source document type).
        "INVENTORY_COUNT",
        // Preparation & Kitchen Operations Platform — additive, same convention.
        "MANUAL_CONSUMPTION",
        "WASTE",
        "PRODUCTION_ORDER",
        // Enterprise Finance/Inventory Platform — additive, same convention. Each represents a
        // posting engine's source document type that previously had nowhere to post to the GL at
        // all (Sales COGS, supplier cash settlement, cashier-shift cash-count variance).
        "SALES_COGS",
        "PURCHASE_PAYMENT",
        "PURCHASE_REFUND",
        "CASHIER_SHIFT_VARIANCE",
      ],
      default: null,
    },
    sourceRef: { type: Schema.Types.ObjectId, refPath: "sourceType", default: null },

    debit: { type: Number, min: 0, default: 0 },
    credit: { type: Number, min: 0, default: 0 },

    currency: { type: String, uppercase: true, required: true },
    exchangeRate: { type: Number, default: 1 },
    convertedDebit: { type: Number, default: 0 },
    convertedCredit: { type: Number, default: 0 },

    costCenter: { type: Schema.Types.ObjectId, ref: "CostCenter", default: null },
  },
  { timestamps: true }, // DB-008: `{ _id: false }` removed
);

// DB-008: a line must have exactly one of debit/credit set — never both, never neither.
journalLineSchema.pre("validate", function (next) {
  const hasDebit = this.debit > 0;
  const hasCredit = this.credit > 0;
  if (hasDebit === hasCredit) {
    return next(new Error("JournalLine: exactly one of debit or credit must be greater than zero."));
  }
  next();
});

// The dominant ledger-reporting access path: "every line for this account, in this period, at this branch."
journalLineSchema.index({ account: 1, brand: 1, branch: 1, period: 1 });

// Enterprise Financial Audit (found via direct index inspection, not inference): `existsForSource()`
// — the idempotency guard EVERY posting engine on this platform calls before EVERY journal posting
// (Order, Invoice, PurchaseInvoice, CashierShift, DailyExpense, AssetDepreciation, WasteRecord, ...)
// — queries exactly `{brand, sourceType, sourceRef}` with zero supporting index until now, meaning
// every single posting in the platform did a full collection scan against JournalLine, its largest
// and fastest-growing collection. This is the single most severe performance finding of the
// Enterprise Financial Audit — fixed here, not deferred, since it affects every domain that posts
// to the GL, not just Accounting/Finance/Assets/Expense.
journalLineSchema.index({ brand: 1, sourceType: 1, sourceRef: 1 });

// Supports date-range reporting queries scoped by branch without an account filter (e.g. a future
// "all activity this month" report) — the existing account-first index above only helps once an
// account list is already known.
journalLineSchema.index({ brand: 1, branch: 1, date: 1 });

const JournalLineModel =
  mongoose.models.JournalLine || mongoose.model("JournalLine", journalLineSchema);

export default JournalLineModel;
