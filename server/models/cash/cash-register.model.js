const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

/**
 * CashRegister Model
 * ------------------
 * Represents ANY cash or cash-equivalent account in the restaurant:
 * - POS cash drawer
 * - Branch safe
 * - Bank account
 * - Employee custody
 * - Suspense / adjustment account
 *
 * All cash movements must reference a CashRegister.
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
      trim: true,
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
        "BANK", // Bank account
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
     * - Bank Account
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

    bankDetails: {
      bankName: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      branch: { type: String, trim: true, maxlength: 100 },
      accountNumber: { type: String, trim: true, maxlength: 50 },
      iban: { type: String, trim: true, maxlength: 34 },
      swiftCode: { type: String, trim: true, maxlength: 11 },
    },
    /**
     * Notes or internal description
     */
    notes: { type: String, trim: true, maxlength: 500 },

    /**
     * Active flag
     * Inactive registers cannot receive new movements
     */
    isActive: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["open", "closed", "suspended"],
      default: "open",
    },

    // Audit
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },

    deletedBy: { type: ObjectId, ref: "Employee" },
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
cashRegisterSchema.index({ employee: 1 });
cashRegisterSchema.index({ accountId: 1 });

module.exports = mongoose.model("CashRegister", cashRegisterSchema);
