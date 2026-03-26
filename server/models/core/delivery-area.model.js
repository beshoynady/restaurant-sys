import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * DeliveryArea Schema
 * -------------------
 * Defines delivery zones for branches with pricing and operational rules.
 * Supports multilingual names (optional, for future expansion).
 * Used in Orders and Invoices.
 */
const DeliveryAreaSchema = new mongoose.Schema(
  {
    // ─────────── Organization Context ───────────
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

    // ─────────── Identity ───────────
    // Multilingual name support: { EN: "Downtown", AR: "وسط المدينة" }
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
      },
    ],

    code: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      // Example: ZONE_A, AREA_01
    },

    // ─────────── Pricing Rules ───────────
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    freeDeliveryThreshold: {
      type: Number,
      default: null,
      min: 0,
    },

    // ─────────── Time & Distance ───────────
    estimatedDeliveryTime: {
      type: Number,
      default: 0,
      min: 0, // in minutes
    },

    maxDeliveryDistance: {
      type: Number,
      default: null,
      min: 0, // in kilometers
    },

    // ─────────── Operational Rules ───────────
    isActive: {
      type: Boolean,
      default: true,
    },

    acceptsCashOnDelivery: {
      type: Boolean,
      default: true,
    },

    acceptsOnlinePayment: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number,
      default: 0,
    },

    // ─────────── Notes & Audit ───────────
    notes: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// ─────────── Indexes ───────────
// Unique delivery area per branch per language
DeliveryAreaSchema.index(
  { branch: 1, "name.$**": 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

// Optional: index code per branch for fast lookup
DeliveryAreaSchema.index(
  { branch: 1, code: 1 },
  { unique: true, sparse: true },
);

const DeliveryAreaModel = mongoose.model("DeliveryArea", DeliveryAreaSchema);

export default DeliveryAreaModel;
