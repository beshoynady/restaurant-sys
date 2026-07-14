import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const StockItemSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      index: true,
    },

    itemName: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    SKU: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z0-9-]+$/,
      // Uniqueness enforced by the {brand,SKU} compound index below (DB-002) — not global
    },
    barcode: {
      type: String,
      sparse: true,
      // Uniqueness enforced by the {brand,barcode} compound index below (DB-002) — not global:
      // two unrelated brands legitimately selling the same physical product share the same real-world barcode.
    },
    categoryId: {
      type: ObjectId,
      ref: "StockCategory",
      required: true,
    },

    itemType: {
      type: String,
      enum: ["ingredient", "supply", "packaging", "service"],
      default: "ingredient",
    },
    inventoryBehavior: {
      type: String,
      enum: [
        "stored", // stored in warehouse
        "directConsume", // directly consumed upon purchase
        "productionOnly", // used in production/recipe only
        "serviceUse", // used when providing a service
      ],
      default: "stored",
    },

    isStocked: {
      type: Boolean,
      default: true,
    },
    isRecipeItem: {
      type: Boolean,
      default: false,
    },
    storageUnit: {
      type: String,
      required: true,
      // example: carton
    },

    ingredientUnit: {
      type: String,
      required: true,
      // example: gram
    },

    parts: {
      type: Number,
      required: true,
      min: 1,
      // 1 carton = 1000 gram
    },

    costMethod: {
      type: String,
      enum: ["FIFO", "LIFO", "WeightedAverage", "StandardCost", "LastPurchaseCost"],
      required: true,
    },
    // Only meaningful when costMethod === "StandardCost": the fixed cost every inbound and
    // outbound movement is valued at. Set/revised manually (a standard-cost revision is itself
    // a deliberate accounting event, never inferred from a purchase price) — see
    // InventoryCostEngine's StandardCost strategy.
    standardCost: { type: Number, default: 0, min: 0 },
    // Cache only, refreshed by StockItemService.updateLastPurchaseCost() after every inbound
    // movement. The authoritative source is StockLedger's most recent inbound row — never write
    // this field directly from anywhere except that refresh path.
    lastPurchaseCost: { type: Number, default: 0, min: 0 },
    hasExpiry: {
      type: Boolean,
      default: false,
    },

    minThreshold: { type: Number, default: 0 },
    maxThreshold: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },
    // V5.2 Replenishment Engine — optional per-item overrides. A missing preferredWarehouse means
    // "use the warehouse the low-stock movement itself occurred in"; a missing preferredSupplier
    // means the engine can only raise a PurchaseRequest (no supplier to pre-fill), never a PO.
    safetyStock: { type: Number, default: 0, min: 0 },
    leadTimeDays: { type: Number, default: 0, min: 0 },
    preferredSupplier: { type: ObjectId, ref: "Supplier", default: null },
    preferredWarehouse: { type: ObjectId, ref: "Warehouse", default: null },
    replenishmentPolicy: {
      type: String,
      enum: ["NONE", "NOTIFY_ONLY", "AUTO_PURCHASE_REQUEST"],
      default: "NONE",
    },

    notes: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    inventoryAccount: {
      type: ObjectId,
      ref: "Account",
    },
    expenseAccount: {
      type: ObjectId,
      ref: "Account",
    },
    cogsAccount: {
      type: ObjectId,
      ref: "Account",
    },

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

StockItemSchema.index({ brand: 1, SKU: 1 }, { unique: true }); // DB-002
// V5.2: `sparse: true` only excludes documents missing the indexed field entirely from the whole
// compound index — it does NOT mean "exclude documents where barcode is null", so two barcode-less
// items in the same brand still collided on `barcode: null`. Same defect class already found and
// fixed on Supplier/Department/JobTitle this engagement; fixed here the same way.
StockItemSchema.index(
  { brand: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $exists: true, $type: "string" } } },
); // DB-002
StockItemSchema.index({ categoryId: 1 });

const StockItemModel = mongoose.model("StockItem", StockItemSchema);
export default StockItemModel;
