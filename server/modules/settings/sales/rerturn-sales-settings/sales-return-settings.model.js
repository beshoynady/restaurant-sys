import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const SalesReturnSettingsSchema = new Schema(
  {
    /** Scope */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null }, // null = default

    /** Return role */
    allowReturn: {
      type: Boolean,
      default: true,
    },

    allowPartialReturn: {
      type: Boolean,
      default: true,
    },

    /** Time limits */
    maxReturnMinutes: {
      type: Number,
      default: 1440, // 24 hours
      min: 0,
    },

    /** Financial behavior */
    refundMethod: {
      type: String,
      enum: ["ORIGINAL_PAYMENT", "CASH", "WALLET", "NO_REFUND"],
      default: "ORIGINAL_PAYMENT",
    },
    /** Decision ownership */
    decisionBy: {
      type: [ObjectId],
      ref: "JobTitle",
      required: true,
    },
    refundTaxes: {
      type: Boolean,
      default: true,
    },
    immutableAfterFinalize: {
      type: Boolean,
      default: true,
    },
    refundServiceCharge: {
      type: Boolean,
      default: true,
    },

    refundDeliveryFee: {
      type: Boolean,
      default: false,
    },

    /** Approval rules */
    requireManagerApproval: {
      type: Boolean,
      default: true,
    },

    approvalThresholdAmount: {
      type: Number,
      default: 0, //
      min: 0,
    },

    /** Accounting */
    generateAccountingEntry: {
      type: Boolean,
      default: true,
    },

    /** Notes & audit */
    requireReturnReason: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

/** Unique per brand + branch */
SalesReturnSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("SalesReturnSettings", SalesReturnSettingsSchema);
