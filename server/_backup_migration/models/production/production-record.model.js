import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/*
 * Production Record Schema
 * Records details of stock production activities
 * including materials used, costs, and production status.
 * Generates data for inventory adjustments and cost tracking.
 */

const productionRecordSchema = new mongoose.Schema(
  {
    productionNumber: {
      type: Number,
      required: true,
      trim: true,
      unique: true,
      min: 1,
      index: true,
    },
    productionOrder: {
      type: ObjectId,
      ref: "ProductionOrder",
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
      required: true,
      min: 1,
      default: 1,
    },

    unit: {
      type: String,
      trim: true,
      maxLength: 10,
      required: true,
    },
    productionStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Canceled", "Rejected"],
      default: "Pending",
    },
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
      required: true,
    },

    productionRecipe: {
      type: ObjectId,
      ref: "ProductionRecipe",
      required: true,
    },

    materialsUsed: [
      {
        material: {
          type: ObjectId,
          ref: "StockItem",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          trim: true,
          maxLength: 10,
          required: true,
        },
        cost: {
          type: Number,
          required: true,
        },
      },
    ],

    opertionCost: [
      {
        operationType: {
          type: String,
          enum: ["Labor", "Machine", "Overhead", "gas", "electricity", "Other"],
          required: true,
        },
        cost: {
          type: Number,
          required: true,
        },
        allocationMethod: {
          type: String,
          enum: ["Fixed", "Variable", "Activity-Based"],
          required: true,
        },
      },
    ],
    productionCost: {
      type: Number,
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
    notes: {
      type: String,
      trim: true,
      maxLength: 200,
    },
    productionStartTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    productionEndTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("ProductionRecord", productionRecordSchema);
