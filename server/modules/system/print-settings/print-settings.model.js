// modules/system/print-settings/print-settings.model.js
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const PrintSettingsSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    branch: { type: ObjectId, ref: "Branch", required: true },

    printerType: {
      type: String,
      enum: ["THERMAL", "A4"],
      default: "THERMAL",
    },

    paperSize: { type: String, default: "80mm" },

    copies: {
      cashier: { type: Number, default: 1 },
      preparation: { type: Number, default: 1 },
    },

    language: { type: String, enum: ["ar", "en"], default: "ar" },

    autoPrint: { type: Boolean, default: true },

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

// One settings document per brand+branch (was missing entirely — nothing
// prevented duplicate PrintSettings docs for the same branch).
PrintSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("PrintSettings", PrintSettingsSchema);
