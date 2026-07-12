import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * cashTransaction
 * ------------
 * Single source of truth for ALL money transactions (cash & non-cash)
 * Operational ledger (not GL journal)
 */
const cashTransactionSchema = new mongoose.Schema(
  {
    /* =============================
       Ownership & Scope
    ============================== */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    // DB-011: link to the GL posting this operational transaction generated — previously absent,
    // meaning the cash trail could not be traced to its journal entry from the document side.
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },

    // DB-013: link back to the cashier shift this transaction occurred during — previously
    // absent, meaning CashierShift.expected.* totals had no persisted, queryable proof of which
    // transactions contributed to them.
    cashierShift: { type: ObjectId, ref: "CashierShift", default: null },

    /* =============================
       Classification
    ============================== */

        /**
     * Physical or logical custody of money
     * (POS, Safe, Bank, Employee)
     */
    cashRegister: {
      type: ObjectId,
      ref: "CashRegister",
    },

    bankAccount: {
      type: ObjectId,
      ref: "BankAccount",
    },

    /**
     * Business reason of the transaction
     */
    transactionType: {
      type: String,
      enum: [
        "SALE",          // Invoice payment
        "PURCHASE",      // Supplier payment
        "EXPENSE",       // Daily expense
        "REFUND",        // Customer refund
        "TRANSFER",      // Between registers
        "DEPOSIT",       // Capital injection
        "WITHDRAWAL",    // Owner withdrawal
        "SETTLEMENT",    // Gateway settlement
        "ADJUSTMENT",    // Shortage / rounding
      ],
      required: true,
      index: true,
    },

    /**
     * Direction of money
     */
    direction: {
      type: String,
      enum: ["INFLOW", "OUTFLOW"],
      required: true,
    },

    // Sequential transaction number, unique per branch — see the {brand,branch,number} compound index below (DB-003)
    number: {
      type: Number,
      required: true,
      min: 1,
    },

    date: {
      type: Date,
      default: Date.now,
      required: true, // DB-003: fixed `requierd` typo, which meant this constraint was silently a no-op
    },
    /* =============================
       Amount
    ============================== */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "EGP",
    },

    /* =============================
       Payment Context
    ============================== */

    /**
     * What the user chose (Cash, Visa, Vodafone, etc.)
     */
    paymentMethod: {
      type: ObjectId,
      ref: "PaymentMethod",
      required: true,
    },

    /**
     * Electronic route (optional)
     * POS terminal, wallet, gateway
     */
    paymentChannel: {
      type: ObjectId,
      ref: "PaymentChannel",
      default: null,
    },

    /**
     * External reference
     * POS slip, wallet ref, bank txn
     */
    externalReference: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /* =============================
       Transfer Support
    ============================== */

    /**
     * Used to link paired transactions (Transfer / Settlement)
     */
    relatedTransaction: {
      type: ObjectId,
      ref: "cashTransaction",
      default: null,
    },

    /* =============================
       Operational Metadata
    ============================== */
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    status: {
      type: String,
      enum: ["DRAFT", "POSTED"],
      default: "DRAFT",
    },
    postedAt: Date,

    /* =============================
       References
    ============================== */
    orderId: { type: ObjectId, ref: "Order" },
    invoiceId: { type: ObjectId, ref: "Invoice" },
    supplierTransactionId: { type: ObjectId, ref: "SupplierTransaction" },
    dailyExpenseId: { type: ObjectId, ref: "DailyExpense" },

    /* =============================
       Audit
    ============================== */
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    attachmentUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

/* =============================
   Indexes
============================== */
cashTransactionSchema.index({ brand: 1, branch: 1, number: 1 }, { unique: true }); // DB-003 — this collection previously had no uniqueness constraint on `number` at all
cashTransactionSchema.index({ cashierShift: 1 }); // DB-013
cashTransactionSchema.index({ brand: 1, branch: 1, createdAt: -1 });
cashTransactionSchema.index({ cashRegister: 1, createdAt: -1 });
cashTransactionSchema.index({ paymentMethod: 1 });
cashTransactionSchema.index({ transactionType: 1 });

export default mongoose.model("cashTransaction", cashTransactionSchema);
