import mongoose from "mongoose";
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

    name: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
        required: true,
      },
    ],

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

    description: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
      },
    ],

    address: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
      },
    ],

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
      ref: "UserAccount",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true, versionKey: false },
);

// Code unique per branch
WarehouseSchema.index({ brand: 1, branch: 1, code: 1 }, { unique: true });

export default mongoose.model("Warehouse", WarehouseSchema);
