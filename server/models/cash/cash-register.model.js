import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * CashRegister Model
 * ------------------
 * Represents ANY cash or cash-equivalent account in the restaurant:
 * - POS cash drawer
 * - Branch safe
 * - Employee custody
 * - Suspense / adjustment account
 *
 * All cash transactions must reference a CashRegister.
 */
const cashRegisterSchema = new mongoose.Schema(
  {
    // Multi-brand support
    brand: { type: ObjectId, ref: "Brand", required: true },

    // Branch reference (required for POS & Safe)
    branch: { type: ObjectId, ref: "Branch", default: null },

    /**
     * Cash register name (multi-language)
     * Example: { en: "Main Cashier", ar: "صندوق الكاشير الرئيسي" }
     */
    name: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      unique: true,
    },
    /**
     * Cash register type
     * Controls behavior, validations, and accounting rules
     */
    type: {
      type: String,
      enum: [
        "POS", // Cashier / sales drawer
        "SAFE", // Branch safe
        "EMPLOYEE", // Employee custody
        "SUSPENSE", // Rounding / differences
      ],
      required: true,
    },

    /**
     * Employee responsible for this register
     * - Required for POS & EMPLOYEE
     * - Optional for SAFE & BANK
     */
    employee: {
      type: ObjectId,
      ref: "Employee",
      required: function () {
        return ["POS", "EMPLOYEE"].includes(this.type);
      },
    },

    /**
     * Linked GL Account (Accounting Integration)
     * Example:
     * - Cash on Hand
     * - Cash Differences
     */
    accountId: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },

    currency: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    /**
     * Current balance
     * Can be negative in case of shortages or timing differences
     */
    balance: {
      type: Number,
      default: 0,
      required: true,
    },

    /**
     * Optional maximum allowed balance
     * Useful for POS drawers and employee custody
     */
    maxBalance: {
      type: Number,
      default: null,
    },
    /**
     * Notes or internal description
     */
    notes: { type: String, trim: true, maxlength: 500 },

    /**
     * Active flag
     * Inactive registers cannot receive new transactions
     */
    isActive: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["open", "closed", "suspended"],
      default: "open",
    },

    // Audit
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },

    deletedBy: { type: ObjectId, ref: "UserAccount" },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

/**
 * Indexes
 */
cashRegisterSchema.index({ brand: 1, branch: 1, type: 1 });
cashRegisterSchema.index({ brand: 1, code: 1 }, { unique: true });
cashRegisterSchema.index({ employee: 1 });
cashRegisterSchema.index({ accountId: 1 });

export default mongoose.model("CashRegister", cashRegisterSchema);
