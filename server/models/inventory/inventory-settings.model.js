import mongoose from "mongoose";
const { ObjectId } = Schema.Types;

const inventorySettingsSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: false },

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
  },
  { timestamps: true }
);

// One inventory settings per branch
inventorySettingsSchema.index({ branch: 1 }, { unique: true });

const InventorySettingModel = model(
  "InventorySetting",
  inventorySettingsSchema
);

export default InventorySettingModel;
