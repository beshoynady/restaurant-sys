import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const ShiftSettingsSchema = new mongoose.Schema({
  brand: { type: ObjectId, ref: "Brand", required: true },
  branch: { type: ObjectId, ref: "Branch", default: null },

  autoOpen: { type: Boolean, default: false },
  autoClose: { type: Boolean, default: true },

  allowNegativeCash: { type: Boolean, default: false },

  maxDifferenceAllowed: { type: Number, default: 50 },

  createdBy: { type: ObjectId, ref: "UserAccount", default: null },
  updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
}, { timestamps: true });

// One settings document per brand+branch (branch: null = brand-wide)
ShiftSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("ShiftSettings", ShiftSettingsSchema);
