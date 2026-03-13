const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const WarehouseSchema = new mongoose.Schema(
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

    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      required: true, // { en, ar }
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9]{1,10}$/,
    },

    type: {
      type: String,
      enum: ["main", "kitchen", "bar", "warehouse", "outlet", "other"],
      default: "main",
      required: true,
    },
    isVirtual: {
      type: Boolean,
      default: false,
    },

    allowReceiving: {
      type: Boolean,
      default: true,
    },

    allowIssuing: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
    },

    address: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
    },

    storekeepers: [
      {
        type: ObjectId,
        ref: "Employee",
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive", "closed", "under_maintenance"],
      default: "active",
    },

    notes: String,

    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true, versionKey: false },
);

// Code unique per branch
WarehouseSchema.index({ brand: 1, branch: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Warehouse", WarehouseSchema);
