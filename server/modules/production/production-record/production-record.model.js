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
    // DB-003: previously absent — the most severe multi-tenancy gap found in the Production domain
    // (this collection carried no tenant scoping at all). Backfilled from `warehouse` — see the
    // DB-003-backfill-production-record-brand-branch migration.
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
    productionNumber: {
      type: Number,
      required: true,
      trim: true,
      min: 1,
      // DB-003: field-level `unique: true` removed — uniqueness enforced by the {brand,branch,productionNumber} compound index below.
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

productionRecordSchema.index({ brand: 1, branch: 1, productionNumber: 1 }, { unique: true }); // DB-003

export default mongoose.model("ProductionRecord", productionRecordSchema);
