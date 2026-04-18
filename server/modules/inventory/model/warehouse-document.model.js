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
