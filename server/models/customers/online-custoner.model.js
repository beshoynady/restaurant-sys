const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

/**
 * =====================================================
 * Online Customer Schema
 * Used for authenticated customers ordering online
 * Multi-tenant ready (Brand-based isolation)
 * =====================================================
 */

const onlineCustomerSchema = new mongoose.Schema(
  {
    /* =====================================================
       🔹 Multi-Tenant Support
    ===================================================== */
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    /* =====================================================
       🔹 Basic Information
    ===================================================== */
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    email: {
      type: String,
      maxlength: 100,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Invalid email format"],
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      maxlength: 30,
    },

    /* =====================================================
       🔹 Authentication
    ===================================================== */
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Never returned unless explicitly selected
    },

    /* =====================================================
       🔹 Address Management
    ===================================================== */
    addresses: [
      {
        address: {
          type: String,
          required: true,
          trim: true,
          // Full address
        },
        deliveryArea: {
          type: ObjectId,
          ref: "DeliveryArea",
          required: true,
          // Linked delivery area
        },
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
            // GeoJSON type
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            // Geolocation coordinates
          },
        },
        isDefault: {
          type: Boolean,
          default: false,
          // Marks the default delivery address
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 300,
          // Any notes related to this address
        },
      },
    ],

    /* =====================================================
       🔹 Customer Preferences
    ===================================================== */
    favorites: [
      {
        type: ObjectId,
        ref: "Product",
      },
    ],

    tags: [
      {
        type: String,
        enum: ["vip", "loyal", "high_spender", "new_customer", "inactive"],
      },
    ],

    /* =====================================================
       🔹 Loyalty & Statistics
    ===================================================== */
    loyalty: {
      points: { type: Number, default: 0 },
      tier: {
        type: String,
        enum: ["regular", "silver", "gold", "vip"],
        default: "regular",
      },
    },

    /* =====================================================
       🔹 Verification & Status
    ===================================================== */
    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    verifiedAt: Date,

    isActive: {
      type: Boolean,
      default: true,
    },

    /* =====================================================
       🔹 Soft Delete
    ===================================================== */
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
    deletedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
  },
);

/* =====================================================
   🔹 Indexes
===================================================== */

// Unique phone per brand
onlineCustomerSchema.index({ phone: 1, brand: 1 }, { unique: true });

// Optional unique email per brand
onlineCustomerSchema.index(
  { email: 1, brand: 1 },
  { unique: true, sparse: true },
);

// Fast filtering for dashboard
onlineCustomerSchema.index({ brand: 1, isDeleted: 1 });

module.exports = mongoose.model("OnlineCustomer", onlineCustomerSchema);
