import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const WarehouseDocumentSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    documentType: {
      type: String,
      enum: ["IN", "OUT", "TRANSFER", "ADJUSTMENT"],
      required: true,
    },
    postingDate: {
      type: Date,
      required: true,
    },
    transactionType: {
      type: String,
      enum: [
        "Purchase",
        "ReturnPurchase",
        "Issuance",
        "ReturnIssuance",
        "Transfer",
        "Wastage",
        "Damage",
        "InventoryCount",
        "OpeningBalance",
        "StockAdjustment",
        // Preparation & Kitchen Operations Platform: operational consumption of non-recipe-driven
        // materials (oil, gas, packaging, cleaning supplies) — see ManualConsumption. Distinct
        // from "Issuance" (which already means recipe/order-driven deduction) and from
        // "Wastage"/"Damage" (loss, not planned operational use).
        "ManualConsumption",
        // Enterprise Production Platform: a ProductionOrder's completion posts TWO separate
        // WarehouseDocuments (a sequence of individually-atomic steps, the same accepted tradeoff
        // already documented on GoodsReceiptNote/PurchaseReturn/InventoryCount — not one mixed-
        // direction document) — "ProductionConsume" for the raw-material OUT movements, and
        // "ProductionYield" for the produced-item IN movement.
        "ProductionConsume",
        "ProductionYield",
      ],
      required: true,
    },

    documentNumber: {
      type: String,
      required: true,
    },

    sourceWarehouse: {
      type: ObjectId,
      ref: "Warehouse",
    },

    destinationWarehouse: {
      type: ObjectId,
      ref: "Warehouse",
    },

    items: [
      {
        stockItem: {
          type: ObjectId,
          ref: "StockItem",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        unitCost: {
          type: Number,
          required: true,
        },
        totalCost: {
          type: Number,
          required: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ["draft", "approved", "posted", "canceled"],
      default: "draft",
    },

    journalEntry: {
      type: ObjectId,
      ref: "JournalEntry",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },

    approvedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    approvedAt: Date,
  },
  { timestamps: true, versionKey: false }
);

WarehouseDocumentSchema.index(
  { brand: 1, branch: 1, documentNumber: 1 },
  { unique: true }
);

export default mongoose.model("WarehouseDocument", WarehouseDocumentSchema);
