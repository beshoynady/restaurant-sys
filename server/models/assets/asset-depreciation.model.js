import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * AssetDepreciation Schema
 * ------------------------
 * Represents a single depreciation event for an asset
 * for a specific accounting period.
 *
 * This model DOES NOT calculate depreciation.
 * It only stores the RESULT of depreciation calculation
 * and links it to the accounting journal entry.
 *
 * Example:
 * - Asset: Oven
 * - Period: 2026-01
 * - Amount: 1,250.00
 */
const assetDepreciationSchema = new mongoose.Schema(
  {
    Brand: { type: ObjectId, ref: "Brand", required: true },
    Branch: { type: ObjectId, ref: "Branch", required: true },
    /* =========================
       Asset Reference
       ========================= */

    // The asset being depreciated
    asset: {
      type: ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["Automatic", "Manual"],
      default: "Automatic",
    },

    /* =========================
       Accounting Period
       ========================= */

    /**
     * Accounting period in YYYY-MM format
     * Example: "2026-01"
     * Used to prevent duplicate depreciation
     */
    period: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      index: true,
    },

    /* =========================
       Depreciation Amount
       ========================= */

    // Depreciation expense amount for this period
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /* =========================
       Journal Integration
       ========================= */

    /**
     * Reference to the posted journal entry
     * Debit: Depreciation Expense
     * Credit: Accumulated Depreciation
     */
    journalEntryId: {
      type: ObjectId,
      ref: "JournalEntry",
    },

    /* =========================
       Status Control
       ========================= */

    /**
     * Draft  → Calculated but not posted to GL
     * Posted → Journal entry created and locked
     */
    status: {
      type: String,
      enum: ["Draft", "Posted"],
      default: "Posted",
      index: true,
    },

    /* =========================
       Audit Fields
       ========================= */

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },

    postedAt: {
      type: Date,
    },
    
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  },
);

/* =========================
   Business Rules & Indexes
   ========================= */

// Prevent duplicate depreciation for the same asset and period
assetDepreciationSchema.index({ asset: 1, period: 1 }, { unique: true });

// Automatically set postedAt when status becomes Posted
assetDepreciationSchema.pre("save", function (next) {
  if (this.status === "Posted" && !this.postedAt) {
    this.postedAt = new Date();
  }
  next();
});

const AssetDepreciationModel = mongoose.model(
  "AssetDepreciation",
  assetDepreciationSchema,
);

export defaultAssetDepreciationModel;
