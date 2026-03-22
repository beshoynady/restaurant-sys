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

    type: {
      type: String,
      enum: ["fromCashToBank", "fromBankToCash", "betweenCash", "betweenBank"],
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
      enum: ["DRAFT", "POSTED"],
      default: "DRAFT",
    },

    postedAt: Date,

    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

/**
 * Indexes
 */
cashTransferSchema.index(
  { brand: 1, number: 1 },
  { unique: true }
);

export default mongoose.model("CashTransfer", cashTransferSchema);