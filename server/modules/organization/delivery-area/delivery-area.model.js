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
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },

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

    pricingType: {
      enum: ["fixed", "distance_based"],
      type: String,
      default: "fixed",
    }, // If distance_based, deliveryFee is the base fee and additional fees may apply based on distance

    coverageArea: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: [[[Number]]],
    }, // GeoJSON Polygon defining the delivery area boundaries

    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // If order total is above this threshold, delivery is free. Null means no free delivery threshold.
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
    // If null, no distance limit. Otherwise, orders beyond this distance will not be accepted.
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
    // If true, this delivery area is currently accepting orders. Can be used for temporary closures or testing.
    acceptsCashOnDelivery: {
      type: Boolean,
      default: true,
    },
    // If false, this delivery area will not accept online payments. Useful for areas where online payment is not available or for testing purposes.
    acceptsOnlinePayment: {
      type: Boolean,
      default: true,
    },
    // priority can be used to determine which delivery area to apply when multiple areas match an order's location
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
      required: true,
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
