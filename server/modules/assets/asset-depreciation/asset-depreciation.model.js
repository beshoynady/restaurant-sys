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
    // DB-012: fixed casing (`Brand`/`Branch`→`brand`/`branch`) — any shared tenant-scoping query
    // helper filtering on the lowercase field name (the convention used by every other model)
    // previously ignored this collection entirely.
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
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

    // DB-012: was a free-text "YYYY-MM" string disconnected from the AccountingPeriod
    // collection — depreciation postings could never be checked against a period's lock state.
    // Renamed to `periodLabel` and kept (existing data preserved, not dropped); `period` below is
    // the new authoritative reference, backfilled by
    // scripts/migrations/DB-012-backfill-asset-depreciation-period-ref.ts.
    periodLabel: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },

    /**
     * Accounting period reference — matches the pattern used by JournalEntry/JournalLine.
     * Used to prevent duplicate depreciation for the same asset+period, and to allow period-lock
     * enforcement.
     */
    period: {
      type: ObjectId,
      ref: "AccountingPeriod",
      default: null,
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

    // PLATFORM_FINAL_AUDIT.md PA-02
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  {
    timestamps: true, // createdAt & updatedAt
  },
);

/* =========================
   Business Rules & Indexes
   ========================= */

// Prevent duplicate depreciation for the same asset and period
assetDepreciationSchema.index({ asset: 1, periodLabel: 1 }, { unique: true }); // DB-012: kept on the legacy label pending full migration to `period`
assetDepreciationSchema.index({ asset: 1, period: 1 }, { unique: true, sparse: true }); // DB-012: the new authoritative constraint, sparse until every row is backfilled

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

export default AssetDepreciationModel;
