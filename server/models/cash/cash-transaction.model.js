import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * cashTransaction
 * ------------
 * Single source of truth for ALL money movements (cash & non-cash)
 * Operational ledger (not GL journal)
 */
const cashTransactionSchema = new mongoose.Schema(
  {
    /* =============================
       Ownership & Scope
    ============================== */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    /* =============================
       Classification
    ============================== */

    /**
     * Business reason of the movement
     */
    movementType: {
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
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: Date,
      default: Date.now,
      requierd: true,
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
     * Physical or logical custody of money
     * (POS, Safe, Bank, Employee)
     */
    cashRegister: {
      type: ObjectId,
      ref: "CashRegister",
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
     * Used to link paired movements (Transfer / Settlement)
     */
    relatedMovement: {
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
      ref: "Employee",
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
cashTransactionSchema.index({ brand: 1, branch: 1, createdAt: -1 });
cashTransactionSchema.index({ cashRegister: 1, createdAt: -1 });
cashTransactionSchema.index({ paymentMethod: 1 });
cashTransactionSchema.index({ movementType: 1 });

export default mongoose.model("cashTransaction", cashTransactionSchema);
