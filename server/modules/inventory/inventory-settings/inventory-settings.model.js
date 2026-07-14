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

    // Auto-generate a draft PurchaseRequest when a StockItem's available quantity drops below its
    // reorder threshold — Supply Chain & Commerce Platform V5.1's Reorder Engine. Draft only, per
    // "never invent business data" — a human still reviews and submits it.
    autoGenerateReorderRequests: { type: Boolean, default: false },

    // Supply Chain & Commerce Platform V5.1 — numbering for InventoryCount and
    // StockTransferRequest, via the shared SequenceGeneratorService (same pattern as
    // PurchasingSettings' purchaseOrderSequence/goodsReceiptSequence).
    countSequence: {
      prefix: { type: String, default: "CNT-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },
    transferSequence: {
      prefix: { type: String, default: "TRF-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
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
