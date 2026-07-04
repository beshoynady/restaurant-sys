// modules/system/tax-settings/tax-config.model.js
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * TaxConfigSchema
 * ------------------
 * Defines tax rules per branch. Supports VAT with flexible calculation logic.
 * Suitable for single-branch, multi-branch, and SaaS environments.
 */
const TaxConfigSchema = new mongoose.Schema(
  {
    // ------------------------------
    // Brand and Branch References
    // ------------------------------
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
      // Reference to the parent brand
    },

    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
      index: true,
      // Reference to a specific branch.
      // If null, settings apply to all branches under the brand.
    },

    taxName: {
      type: String,
      trim: true,
      default: "VAT",
      // Name of the tax (e.g., VAT, GST). Useful for display purposes.
    },
    taxNumber: {
      type: String,
      trim: true,
      default: "",
      // Tax registration number for invoicing and legal compliance.
    },

    // ------------------------------
    // VAT Configuration
    // ------------------------------
    enabled: {
      type: Boolean,
      default: true,
      // Enable or disable VAT for this branch
    },

    percentage: {
      type: Number,
      default: 14,
      min: 0,
      max: 100,
      // VAT percentage rate.
      // Example: Egypt 14%, KSA/UAE 15%, EU varies.
    },

    vatReceivableAccount: {
      type: ObjectId,
      ref: "Account",
      // Accounting account for VAT receivable (collected from customers)
    },

    vatPayableAccount: {
      type: ObjectId,
      ref: "Account",
      // Accounting account for VAT payable (owed to government or suppliers)
    },

    // ------------------------------
    // Calculation Method
    // ------------------------------
    calculationMethod: {
      type: String,
      enum: ["BEFORE_DISCOUNT", "AFTER_DISCOUNT"],
      default: "AFTER_DISCOUNT",
      // Determines whether VAT is calculated on:
      // BEFORE_DISCOUNT → original subtotal
      // AFTER_DISCOUNT  → subtotal after discounts/promotions
    },

    // ------------------------------
    // Pricing Behavior
    // ------------------------------
    pricesIncludeTax: {
      type: Boolean,
      default: false,
      // Indicates if menu item prices include VAT.
      // True → Prices already include tax
      // False → Tax will be added on top of menu prices
    },

    // ------------------------------
    // Optional: Tax Reporting & Compliance
    // ------------------------------
    taxReportingCode: {
      type: String,
      trim: true,
      default: "",
      // Optional code for tax reporting or integration with tax authorities.
    },

    taxFilingFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "annually"],
      default: "monthly",
      // Frequency of tax filing for this branch. Useful for compliance tracking.
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: { type: ObjectId, ref: "UserAccount" },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

/**
 * Indexing
 * --------
 * Ensures efficient querying per branch and brand
 */
TaxConfigSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("TaxConfig", TaxConfigSchema);
