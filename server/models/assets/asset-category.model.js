import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * AssetCategory Schema
 * -------------------
 * Defines accounting and depreciation rules for asset groups.
 * Examples:
 * - Kitchen Equipment
 * - Furniture
 * - Vehicles
 * - POS Devices
 *
 * This model is the KEY link between Assets and the General Ledger.
 * Each asset category controls:
 * - Asset account
 * - Depreciation expense account
 * - Accumulated depreciation account
 * - Disposal gain/loss account
 */
const assetCategorySchema = new mongoose.Schema(
  {
    // Category name (multi-language support)
    name: {
      type: Map,
      of: String,
      required: true,
      trim: true,
    },

    /**
     * Asset classification
     * FixedAsset → depreciable assets (most restaurant equipment)
     * CurrentAsset → non-depreciable short-term assets
     */
    assetType: {
      type: String,
      enum: ["Fixed", "Current", "Intangible"],
      required: true,
    },

    /* =========================
       Accounting Integration
       ========================= */

    // Main asset GL account (Balance Sheet)
    // Example: Kitchen Equipment Account
    assetAccount: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },

    // Depreciation expense account (Income Statement)
    // Example: Depreciation Expense - Equipment
    depreciationExpenseAccount: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },

    // Accumulated depreciation account (Contra Asset)
    // Example: Accumulated Depreciation - Equipment
    accumulatedDepreciationAccount: {
      type: ObjectId,
      ref: "Account",
      required: true,
    },

    // Gain or Loss account when disposing/selling the asset
    // Used to record profit or loss on disposal
    disposalGainAccount: { type: ObjectId, ref: "Account" },
    disposalLossAccount: { type: ObjectId, ref: "Account" },
    /* =========================
       Default Depreciation Rules
       ========================= */

    // Default useful life in MONTHS
    // Can be overridden at asset level
    defaultUsefulLife: {
      type: Number,
      min: 1,
    },

    // Default depreciation method for assets in this category
    defaultDepreciationMethod: {
      type: String,
      enum: ["StraightLine", "DecliningBalance"],
      default: "StraightLine",
    },

    // Whether depreciation is allowed for this category
    isDepreciable: {
      type: Boolean,
      default: true,
    },

    /* =========================
       Audit Fields
       ========================= */

    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  },
);

/* =========================
   Business Rules
   ========================= */

// Prevent depreciation accounts for non-depreciable assets
assetCategorySchema.pre("save", function (next) {
  if (!this.isDepreciable) {
    this.depreciationExpenseAccount = undefined;
    this.accumulatedDepreciationAccount = undefined;
  }
  next();
});

const AssetCategoryModel = mongoose.model("AssetCategory", assetCategorySchema);

export default AssetCategoryModel;
