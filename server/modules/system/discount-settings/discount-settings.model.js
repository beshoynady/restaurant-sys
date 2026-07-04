// modules/system/discount-settings/discount-settings.model.js
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * DiscountSettings Schema
 * Manages discount policies per brand and branch.
 * This affects POS, invoices, and cashier behavior regarding discounts.
 */
const DiscountSettingsSchema = new mongoose.Schema(
  {
    // =========================
    // Scope
    // =========================
    brand: { type: ObjectId, ref: "Brand", required: true },
    // null = default for all branches
    branch: { type: ObjectId, ref: "Branch", default: null },

    // =========================
    // Manual discount limits
    // =========================
    maxManualDiscount: {
      type: Number,
      default: 20, // % maximum allowed discount
      min: 0,
      max: 100,
    },

    // =========================
    // Approval rules
    // =========================
    requireManagerApproval: {
      type: Boolean,
      default: true,
      // true => any discount above maxManualDiscount needs manager approval
    },

    approvalThreshold: {
      type: Number,
      default: 20, // % discount above which manager approval is required
      min: 0,
      max: 100,
    },

    // =========================
    // Discount scope
    // =========================
    allowItemDiscount: {
      type: Boolean,
      default: true,
      // Allow discount on individual items
    },
    allowInvoiceDiscount: {
      type: Boolean,
      default: true,
      // Allow discount on the total invoice
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    // ================================
    // AUDIT
    // ================================

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
  { timestamps: true },
);

// Ensure one settings document per brand/branch
DiscountSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("DiscountSettings", DiscountSettingsSchema);
