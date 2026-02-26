const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;


/*Inventory Schema to track stock levels in warehouses*/

const InventorySchema = new mongoose.Schema(
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
      required: true,
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

    quantity: {
      type: Number,
      default: 0,
    },

    avgUnitCost: {
      type: Number,
      default: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
    },

    lastMovementAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    cre
  },
  { timestamps: true, versionKey: false }
);

// Unique balance per item per warehouse
InventorySchema.index(
  { warehouse: 1, stockItem: 1 },
  { unique: true }
);

module.exports = mongoose.model("Inventory", InventorySchema);
