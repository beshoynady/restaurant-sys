const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

/**
 * AssetTransaction Schema
 * -----------------------
 * This model represents ALL lifecycle events related to an asset.
 * It is an immutable audit log (NO updates after creation).
 *
 * Examples of asset transactions:
 * - Asset purchase
 * - Periodic depreciation
 * - Internal transfer between branches
 * - Maintenance cost
 * - Disposal / write-off
 * - Asset sale
 *
 * ⚠ This model DOES NOT update asset balances directly.
 * It only records WHAT happened.
 * Actual accounting impact is handled via Journal Entries.
 */
const assetTransactionSchema = new mongoose.Schema(
  {
    /* =========================
       Organization Scope
       ========================= */

    // Brand reference (multi-brand support)
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    // Branch where the transaction occurred
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    /* =========================
       Asset Reference
       ========================= */

    // Asset affected by this transaction
    asset: {
      type: ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },

    /* =========================
       Transaction Classification
       ========================= */

    /**
     * Type of asset transaction
     *
     * Purchase     → Initial acquisition
     * Depreciation → Periodic depreciation record
     * Transfer     → Internal movement between branches
     * Maintenance  → Repair or maintenance cost
     * Disposal     → Asset written off
     * Sale         → Asset sold
     */
    type: {
      type: String,
      enum: [
        "Purchase",
        "Depreciation",
        "Transfer",
        "Maintenance",
        "Disposal",
        "Sale",
      ],
      required: true,
      index: true,
    },

    /* =========================
       Financial Data
       ========================= */

    /**
     * Transaction monetary value
     *
     * Examples:
     * - Purchase cost
     * - Depreciation amount
     * - Maintenance expense
     * - Sale value
     */
    amount: {
      type: Number,
      min: 0,
    },

    /**
     * Direction of value impact
      * INCREASE → Asset value increases (e.g., Purchase)
      * DECREASE → Asset value decreases (e.g., Depreciation, Disposal)
    */
    direction: {
      type: String,
      enum: ["INCREASE", "DECREASE"],
    },

    /* =========================
       External References
       ========================= */

    /**
     * Reference model name
     * Examples:
     * - JournalEntry
     * - AssetDepreciation
     * - MaintenanceOrder
     * - Invoice
     */
    referenceModel: {
      type: String,
      enum: [
        "JournalEntry",
        "AssetDepreciation",
        "MaintenanceOrder",
        "AssetPurchaseInvoice",
      ],
      maxlength: 100,
    },

    // ID of the referenced document
    referenceId: {
      type: ObjectId,
      refPath: "referenceModel",
      maxlength: 100,
    },

    /* =========================
       Notes & Audit
       ========================= */

    // Optional notes for this transaction
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Employee who performed or recorded this transaction
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  },
);

/* =========================
   Indexes & Rules
   ========================= */

// Optimize queries for asset history
assetTransactionSchema.index({ asset: 1, createdAt: -1 });

// Prevent accidental updates (audit safety)
assetTransactionSchema.pre("findOneAndUpdate", function () {
  throw new Error("Asset transactions are immutable and cannot be updated.");
});

assetTransactionSchema.pre("updateOne", function () {
  throw new Error("Asset transactions are immutable and cannot be updated.");
});

const AssetTransactionModel = mongoose.model(
  "AssetTransaction",
  assetTransactionSchema,
);

export default AssetTransactionModel;
