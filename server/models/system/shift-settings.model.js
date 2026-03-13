import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const ShiftSettingsSchema = new mongoose.Schema({
  brand: { type: ObjectId, ref: "Brand", required: true },
  branch: { type: ObjectId, ref: "Branch", default: null },

  autoOpen: { type: Boolean, default: false },
  autoClose: { type: Boolean, default: true },

  allowNegativeCash: { type: Boolean, default: false },

  maxDifferenceAllowed: { type: Number, default: 50 }
}, { timestamps: true });

export mongoose.model("ShiftSettings", ShiftSettingsSchema);
