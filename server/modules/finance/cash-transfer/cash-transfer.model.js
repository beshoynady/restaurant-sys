import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * CashTransfer Model
 * ------------------
 * Handles ALL internal money transfers:
 * - Cash → Cash
 * - Cash → Bank
 * - Bank → Cash
 * - Bank → Bank
 */
const cashTransferSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    // DB-011: link to the GL posting this transfer generated — previously absent.
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },

    number: {
      type: Number,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      default: "EGP",
    },

    fromType: {
      type: String,
      enum: ["CASH_REGISTER", "BANK_ACCOUNT"],
      required: true,
    },

    toType: {
      type: String,
      enum: ["CASH_REGISTER", "BANK_ACCOUNT"],
      required: true,
    },
    /* =============================
       SOURCE (FROM)
    ============================== */

    fromCashRegister: {
      type: ObjectId,
      ref: "CashRegister",
    },

    fromBankAccount: {
      type: ObjectId,
      ref: "BankAccount",
    },

    /* =============================
       DESTINATION (TO)
    ============================== */

    toCashRegister: {
      type: ObjectId,
      ref: "CashRegister",
    },

    toBankAccount: {
      type: ObjectId,
      ref: "BankAccount",
    },

    /* =============================
       Transfer Metadata
    ============================== */

    /**
     * External reference
     * Bank transfer number, deposit slip...
     */
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    status: {
      type: String,
      // PLATFORM_FINAL_AUDIT.md PA-02: added CANCELLED — see
      // cash-transaction.model.js.
      enum: ["DRAFT", "POSTED", "CANCELLED"],
      default: "DRAFT",
    },

    postedAt: Date,

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
  },
  { timestamps: true },
);

/**
 * Indexes
 */
cashTransferSchema.index({ brand: 1, branch: 1, number: 1 }, { unique: true }); // DB-003: was {brand,number} only

export default mongoose.model("CashTransfer", cashTransferSchema);
