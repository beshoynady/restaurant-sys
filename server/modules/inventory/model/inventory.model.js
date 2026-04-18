import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/*Inventory Schema to track stock levels in warehouses*/

const InventorySchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },

    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
    },

    warehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
    },

    stockItem: {
      type: ObjectId,
      ref: "StockItem",
      required: true,
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
  },
  { timestamps: true, versionKey: false },
);

// Unique balance per item per warehouse
InventorySchema.index({ warehouse: 1, stockItem: 1 }, { unique: true });

export default mongoose.model("Inventory", InventorySchema);
