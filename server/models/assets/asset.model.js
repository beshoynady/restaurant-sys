import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Asset Schema
 * ------------
 * Represents a fixed asset owned by the restaurant such as:
 * - Kitchen equipment
 * - Furniture
 * - POS devices
 * - Vehicles
 *
 * This schema holds the MASTER DATA of the asset only.
 * All depreciation entries must be recorded in a separate
 * AssetDepreciation collection to ensure proper audit trail.
 */
const assetSchema = new mongoose.Schema(
  {
    // Brand reference (multi-brand support)
    brand: { type: ObjectId, ref: "Brand", required: true },

    // Branch where the asset is physically located
    branch: { type: ObjectId, ref: "Branch", required: true },

    // Asset name (multi-language support)
    name: {
      type: Map,
      of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },

      required: true,
      trim: true,
    },

    // Asset category (defines depreciation accounts & rules)
    category: {
      type: ObjectId,
      ref: "AssetCategory",
      required: true,
    },

    /* =========================
       Purchase Information
       ========================= */

    // Original purchase date of the asset
    purchaseDate: { type: Date, required: true },

    // Capitalized purchase cost (excluding VAT if recoverable)
    purchaseCost: { type: Number, required: true, min: 0 },

    // Expected salvage (residual) value at the end of useful life
    salvageValue: { type: Number, default: 0, min: 0 },

    // Useful life of the asset in MONTHS
    usefulLife: { type: Number, required: true, min: 1 },
    
    // Date when asset was capitalized in the books
    capitalizationDate: { type: Date, required: true },

    // Date when depreciation actually starts (optional)
    startDepreciationDate: { type: Date },

    /* =========================
       Depreciation Settings
       ========================= */

    // Depreciation calculation method
    depreciationMethod: {
      type: String,
      enum: ["StraightLine", "DecliningBalance", "Manual"],
      default: "StraightLine",
    },

    // Depreciation calculation frequency
    depreciationPeriod: {
      type: String,
      enum: ["Monthly", "Yearly"],
      default: "Monthly",
    },

    // How depreciation entries are generated
    depreciationMode: {
      type: String,
      enum: ["Automatic", "Manual"],
      default: "Automatic",
    },

    /* =========================
       Financial Snapshot (Derived)
       =========================
       These fields are cached values ONLY.
       The source of truth is AssetDepreciation entries.
       */

    // Total accumulated depreciation till date
    accumulatedDepreciation: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Current book value = purchaseCost - accumulatedDepreciation
    bookValue: {
      type: Number,
      min: 0,
    },

    /* =========================
       Asset Status
       ========================= */

    // Current lifecycle status of the asset
    status: {
      type: String,
      enum: ["Draft", "Active", "Suspended", "Disposed", "Sold"],
      default: "Active",
    },

    /* =========================
       Supplier & Reference
       ========================= */

    // Supplier from whom the asset was purchased
    supplier: { type: ObjectId, ref: "Supplier" },

    // Supplier invoice or reference number
    invoiceRef: { type: String, trim: true },

    /* =========================
       Audit Fields
       ========================= */

    // Employee who created the asset record
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },

    // Employee who last updated the asset
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

/* =========================
   Business Rules & Guards
   ========================= */

// If depreciation method is Manual, force depreciation mode to Manual
assetSchema.pre("save", function (next) {
  if (this.depreciationMethod === "Manual") {
    this.depreciationMode = "Manual";
  }
  next();
});

export default mongoose.model("Asset", assetSchema);
