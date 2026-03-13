import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * InventoryCount
 * ---------------------
 * Represents a physical inventory counting process
 * used to reconcile actual stock quantities with system quantities.
 *
 * Execution will generate:
 * - WarehouseDocument (Adjustment In / Out)
 */

const InventoryCountSchema = new mongoose.Schema(
  {
    // ===============================
    // Scope & Ownership
    // ===============================

    // Brand / company that owns the inventory count
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    // Branch where the inventory count is performed
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    // Warehouse being counted
    warehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    // ===============================
    // Inventory Count Info
    // ===============================

    // Unique inventory count number
    countNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Date of the inventory count
    countDate: {
      type: Date,
      default: Date.now,
    },

    // Type of inventory count
    countType: {
      type: String,
      enum: [
        "Full",      // Full warehouse count
        "Partial",   // Selected items only
        "Cycle",     // Cycle counting
        "Spot",      // Spot check
      ],
      default: "Full",
    },

    // Current status of the inventory count
    status: {
      type: String,
      enum: [
        "Draft",     // Created but not started
        "InProgress",// Counting in progress
        "Submitted", // Submitted for review
        "Approved",  // Approved and ready for execution
        "Executed",  // Adjustments applied
        "Canceled",  // Canceled
      ],
      default: "Draft",
      index: true,
    },

    // ===============================
    // Counted Items
    // ===============================

    // List of counted stock items
    items: [
      {
        // Inventory item being counted
        stockItem: {
          type: ObjectId,
          ref: "StockItem",
          required: true,
        },

        // System quantity before count
        systemQuantity: {
          type: Number,
          required: true,
          min: 0,
        },

        // Actual counted quantity
        countedQuantity: {
          type: Number,
          required: true,
          min: 0,
        },

        // Difference between counted and system quantity
        variance: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        },

        // Unit of measurement
        unit: {
          type: String,
          maxlength: 20,
          required: true,
        },

        // Optional notes per item
        notes: {
          type: String,
          trim: true,
          maxLength: 300,
        },
      },
    ],

    // ===============================
    // Workflow
    // ===============================

    // Employee who created the count
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    // Employee who approved the count
    approvedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // ===============================
    // Execution & Adjustment
    // ===============================

    // Employee who executed the inventory adjustment
    executedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    // Date when the inventory adjustment was executed
    executedAt: {
      type: Date,
      default: null,
    },

    // Adjustment warehouse document generated after execution
    adjustmentDocument: {
      type: ObjectId,
      ref: "WarehouseDocument",
    },

    // ===============================
    // Notes & Reference
    // ===============================

    // General notes
    notes: {
      type: String,
      trim: true,
      maxLength: 500,
    },

    // ===============================
    // Soft Delete & Audit
    // ===============================

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ===============================
// Indexes
// ===============================

// Ensure unique inventory count number per warehouse
InventoryCountSchema.index(
  { brand: 1, branch: 1, warehouse: 1, countNumber: 1 },
  { unique: true }
);

InventoryCountSchema.index({ status: 1 });
InventoryCountSchema.index({ warehouse: 1 });

export mongoose.model("InventoryCount", InventoryCountSchema);
