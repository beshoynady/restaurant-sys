import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const StockLedgerSchema = new mongoose.Schema(
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
      default: null, // null = shared across branches
      index: true,
    },
    warehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    stockItem: {
      type: ObjectId,
      ref: "StockItem",
      required: true,
      index: true,
    },

    movementDate: {
      type: Date,
      default: Date.now,
    },

    documentId: {
      type: ObjectId,
      ref: "WarehouseDocument",
    },

    unitType: {
      type: String,
      enum: ["storage", "ingredient"],
      required: true,
    },

    costMethod: {
      type: String,
      enum: ["FIFO", "LIFO", "WeightedAverage", "StandardCost", "LastPurchaseCost"],
      required: true,
    },
    // Only populated on inbound StandardCost movements: (actual receipt unit cost - standardCost)
    // * quantity. Purely informational this pass — not yet posted to a Purchase Price Variance GL
    // account (no such control account is modeled in AccountingSettings yet); kept on the
    // immutable ledger row so a future PPV posting can be back-filled without re-deriving it.
    priceVariance: { type: Number, default: null },

    source: {
      type: String,
      enum: [
        "OpeningBalance",
        "Purchase",
        "ReturnPurchase",
        "Issuance", // Issuance of stock from warehouse
        "ReturnIssuance", // Return of issued stock to warehouse
        "Wastage", // Wastage of stock due to spoilage or expiration
        "Damaged", // Damaged stock write-off
        "TransferIn", // Transfer of stock into warehouse
        "TransferOut", // Transfer of stock out of warehouse
        "FreeIssue", // Free issue of stock to customers
        "SalesReturn", // Return of sold stock from customers
        // Enterprise Production Platform: fixed the previously-duplicated "ProductionOut" entry
        // (two lines, two conflicting comments — a confirmed schema defect named in
        // PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md §1.3, never actually written by any code
        // until this milestone). "ProductionConsume"/"ProductionYield" match WarehouseDocument's
        // transactionType values exactly (buildMovementPlan's OUT_SOURCE_BY_TRANSACTION falls
        // back to using transactionType itself as source when no explicit mapping exists).
        "ProductionConsume", // Raw materials consumed in production
        "ProductionYield", // Finished/semi-finished goods produced
        "StockAdjustment", // Manual stock adjustment
        "ManualConsumption", // Operational consumption of non-recipe-driven materials (oil, gas, packaging, cleaning supplies)

        "InventoryCount", // Adjustment from physical inventory count
      ],
      required: true,
      index: true,
    },

    description: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    inbound: {
      quantity: { type: Number, default: 0 },
      unitCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },

    outbound: {
      quantity: { type: Number, default: 0 },
      unitCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },

    balanceSnapshot: {
      quantity: { type: Number, required: true },
      unitCost: { type: Number, required: true },
      totalCost: { type: Number, required: true },
    },

    remainingQuantity: {
      type: Number,
      min: 0,
      default: 0,
      // FIFO layer tracking
    },
    // Production date of the stock batch (for perishable items)
    productionDate: {
      type: Date,
      default: null,
    },
    // Expiry date
    expirationDate: {
      type: Date,
      default: null,
    },

    senderType: {
      type: String,
      enum: ["Employee", "Supplier", "System"],
      required: true,
    },
    sender: {
      type: ObjectId,
      refPath: "senderType",
      required: true,
    },

    receiverType: {
      type: String,
      enum: ["Employee", "Supplier", "System"],
      required: true,
    },
    receiver: {
      type: ObjectId,
      refPath: "receiverType",
      required: true,
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
  },
  { timestamps: true, versionKey: false },
);

StockLedgerSchema.index({ warehouse: 1, stockItem: 1, movementDate: 1 });

export default mongoose.model("StockLedger", StockLedgerSchema);
