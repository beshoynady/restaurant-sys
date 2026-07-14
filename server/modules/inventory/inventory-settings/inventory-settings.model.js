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

    // Preparation & Kitchen Operations Platform — where a Recipe's ingredients are actually
    // deducted from. WAREHOUSE_DIRECT (the default) preserves today's exact existing behavior for
    // every brand that hasn't configured operational/preparation inventory at all — this is a
    // deliberate, safe default, not an arbitrary one. PREPARATION_INVENTORY requires the owning
    // Product.preparationSection to have a `warehouse` link (PreparationSectionConfig.warehouse);
    // HYBRID consumes from the preparation warehouse first and falls back to the main warehouse
    // for any shortfall (mirrors the same "fallback cost" reasoning already used by
    // InventoryCostEngine's FIFO/LIFO layer-shortfall handling — a fallback within one policy, not
    // a second competing mechanism).
    recipeConsumptionStrategy: {
      type: String,
      enum: ["WAREHOUSE_DIRECT", "PREPARATION_INVENTORY", "HYBRID"],
      default: "WAREHOUSE_DIRECT",
    },

    // Preparation & Kitchen Operations Platform — numbering for ManualConsumption, same shared
    // SequenceGeneratorService pattern as every other numbered document in this platform.
    manualConsumptionSequence: {
      prefix: { type: String, default: "MC-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

    // Preparation & Kitchen Operations Platform Phase 1 — numbering for WasteRecord.
    wasteRecordSequence: {
      prefix: { type: String, default: "WST-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

    // Enterprise Production Platform — numbering for ProductionOrder.
    productionOrderSequence: {
      prefix: { type: String, default: "PRD-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

    // Preparation & Kitchen Operations Platform Phase 7 — numbering for FryerOilLog.
    fryerOilLogSequence: {
      prefix: { type: String, default: "OIL-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

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
