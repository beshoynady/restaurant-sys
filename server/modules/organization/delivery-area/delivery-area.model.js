import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;
const { Schema } = mongoose;

/**
 * ==========================================================
 * Delivery Area
 * ----------------------------------------------------------
 * Defines delivery zones for a branch.
 * Used to determine:
 * - Delivery fee
 * - Coverage area
 * - Delivery availability
 * - Estimated delivery time
 * ==========================================================
 */

const multilingualString = new Schema(
  {
    type: Map,
    of: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false },
);

const DeliveryAreaSchema = new Schema(
  {
    // =====================================================
    // REFERENCES
    // =====================================================

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

    // =====================================================
    // IDENTITY
    // =====================================================

    name: multilingualString,

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    // =====================================================
    // DELIVERY PRICING
    // =====================================================

    pricingType: {
      type: String,
      enum: ["fixed", "distance_based"],
      default: "fixed",
    },

    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
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

    // =====================================================
    // DELIVERY LIMITS
    // =====================================================

    estimatedDeliveryTimeMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },

    maxDeliveryDistanceKm: {
      type: Number,
      default: null,
      min: 0,
    },

    // =====================================================
    // PAYMENT OPTIONS
    // =====================================================

    acceptsCashOnDelivery: {
      type: Boolean,
      default: true,
    },

    acceptsOnlinePayment: {
      type: Boolean,
      default: true,
    },

    // =====================================================
    // GEO COVERAGE
    // =====================================================

    coverageArea: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
      },

      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },

    // =====================================================
    // DISPLAY & PRIORITY
    // =====================================================

    priority: {
      type: Number,
      default: 0,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // PUBLIC INFO
    // =====================================================

    notes: multilingualString,

    // =====================================================
    // STATUS
    // =====================================================

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    // =====================================================
    // AUDIT
    // =====================================================

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

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================================
// INDEXES
// =====================================================

DeliveryAreaSchema.index({
  coverageArea: "2dsphere",
});

DeliveryAreaSchema.index({
  branch: 1,
  priority: 1,
});

DeliveryAreaSchema.index({
  branch: 1,
  status: 1,
});

DeliveryAreaSchema.index(
  {
    branch: 1,
    code: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

DeliveryAreaSchema.index({
  "name.$**": 1,
});

DeliveryAreaSchema.index(
  {
    branch: 1,
    slug: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

const DeliveryArea = mongoose.model("DeliveryArea", DeliveryAreaSchema);

export default DeliveryArea;
