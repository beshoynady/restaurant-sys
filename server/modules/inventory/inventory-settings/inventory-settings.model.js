import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const inventorySettingsSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    // Automatically deduct ingredients when order is confirmed
    autoDeductOnOrder: {
      type: Boolean,
      default: true,
    },

    // Allow stock to go below zero
    allowNegativeStock: {
      type: Boolean,
      default: false,
    },

    // Minimum quantity before low stock warning
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },

    // Enable production & recipes system
    enableProduction: {
      type: Boolean,
      default: true,
    },

    // Auto approve production orders (no manager approval)
    productionAutoApprove: {
      type: Boolean,
      default: false,
    },

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true }
);

// One inventory settings doc per brand+branch (branch: null = brand-wide)
inventorySettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const InventorySettingModel = mongoose.model(
  "InventorySetting",
  inventorySettingsSchema
);

export default InventorySettingModel;
