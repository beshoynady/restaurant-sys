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
      required: [true, "Production number is required"],
      trim: true,
      unique: true,
      min: [1, "Production number must be at least 1"],
      index: true,
    },
    productionOrder: {
      type: ObjectId,
      ref: "ProductionOrder",
      required: [true, "Production order is required"],
    },
    warehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
    },

    stockItem: {
      type: ObjectId,
      ref: "StockItem",
      required: [true, "Stock item is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },

    unit: {
      type: String,
      trim: true,
      maxLength: 10,
      required: [true, "Unit is required"],
    },
    productionStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Canceled", "Rejected"],
      default: "Pending",
    },
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
      required: [true, "Production section is required"],
    },
    productionRecipe: {
      type: ObjectId,
      ref: "ProductionRecipe",
      required: [true, "Stock Production Recipe is required"],
    },

    materialsUsed: [
      {
        material: {
          type: ObjectId,
          ref: "StockItem",
          required: [true, "Material is required"],
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
        },
        unit: {
          type: String,
          trim: true,
          maxLength: 10,
          required: [true, "Unit is required"],
        },
        cost: {
          type: Number,
          required: [true, "Cost is required"],
        },
      },
    ],

    opertionCost: [
      {
        operationType: {
          type: String,
          enum: ["Labor", "Machine", "Overhead", "gas", "electricity", "Other"],
          required: [true, "Operation type is required"],
        },
        cost: {
          type: Number,
          required: [true, "Cost is required"],
        },
        allocationMethod: {
          type: String,
          enum: ["Fixed", "Variable", "Activity-Based"],
          required: [true, "Allocation method is required"],
        },
      }
    ],
    productionCost: {
      type: Number,
    },
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: [true, "Created by is required"],
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
      required: [true, "Production start time is required"],
      default: Date.now,
    },
    productionEndTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ProductionRecord", productionRecordSchema);
