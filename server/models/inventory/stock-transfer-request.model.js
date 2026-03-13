import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const StockTransferRequestSchema = new mongoose.Schema(
  {
    // ===============================
    // Scope
    // ===============================
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

    // ===============================
    // Warehouses
    // ===============================
    fromWarehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
    },

    toWarehouse: {
      type: ObjectId,
      ref: "Warehouse",
      required: true,
    },

    // ===============================
    // Request Info
    // ===============================
    requestNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    requestDate: {
      type: Date,
      default: Date.now,
    },

    expectedTransferDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "Approved",
        "Rejected",
        "Canceled",
        "Executed",
      ],
      default: "Draft",
      index: true,
    },

    // ===============================
    // Items
    // ===============================
    items: [
      {
        stockItem: {
          type: ObjectId,
          ref: "StockItem",
          required: true,
        },
        requestedQuantity: {
          type: Number,
          required: true,
          min: 0.0001,
        },
        approvedQuantity: {
          type: Number,
          min: 0,
        },
        unit: {
          type: String,
          required: true, // storage unit
        },
        notes: String,
      },
    ],

    // ===============================
    // Workflow
    // ===============================
    requestedBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    submittedAt: Date,

    approvedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    approvedAt: Date,

    rejectedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    rejectedAt: Date,

    rejectionReason: {
      type: String,
      trim: true,
      maxLength: 300,
    },

    // ===============================
    // Execution
    // ===============================
    executedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    executedAt: Date,

    outDocument: {
      type: ObjectId,
      ref: "WarehouseDocument",
    },

    inDocument: {
      type: ObjectId,
      ref: "WarehouseDocument",
    },

    // ===============================
    // Accounting / Reference
    // ===============================
    referenceType: {
      type: String,
      enum: ["Manual", "Production", "Consumption", "InventoryCount"],
      default: "Manual",
    },

    referenceId: {
      type: ObjectId,
    },

    notes: {
      type: String,
      trim: true,
      maxLength: 500,
    },

    // ===============================
    // Audit
    // ===============================
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: Date,

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
StockTransferRequestSchema.index(
  { brand: 1, branch: 1, requestNumber: 1 },
  { unique: true }
);

StockTransferRequestSchema.index({ status: 1 });
StockTransferRequestSchema.index({ fromWarehouse: 1, toWarehouse: 1 });

export mongoose.model("StockTransferRequest", StockTransferRequestSchema);
