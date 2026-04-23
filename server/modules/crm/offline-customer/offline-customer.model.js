import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * OfflineCustomer Model
 * Represents customers who do not have an online account.
 * Typically registered by cashier or staff at the branch.
 */

const offlineCustomerSchema = new mongoose.Schema(
  {
    // 🔹 References
    brand: { type: ObjectId, ref: "Brand", required: true }, // Brand reference
    branch: { type: ObjectId, ref: "Branch", default: null }, // Branch reference

    // 🔹 General Info
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
      // Customer full name
    },
    gender: {
      type: String,
      enum: ["male", "female", "not_specified"],
      default: "not_specified",
      // Customer gender
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
      // Primary phone number
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
      // Customer account status
    },
    isVerified: {
      type: Boolean,
      default: false,
      // Whether the phone/identity is verified
    },

    // 🔹 Addresses & Location
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

    // 🔹 Loyalty & Customer Classification
    loyalty: {
      points: { type: Number, default: 0 }, // Loyalty points accumulated
      tier: { type: String, enum: ["regular", "vip"], default: "regular" }, // VIP or Regular
    },
    tags: [
      {
        type: String,
        enum: [
          "vip", // VIP customers with special privileges
          "high_value", // Customers with high spending
          "loyal", // Long-term loyal customers
          "frequent_order", // Customers who order frequently
          "promotion_eligible", // Eligible for current promotions
          "birthday", // Customers with upcoming birthdays
          "new", // Newly registered customers
          "regular", // Regular customers
          "inactive", // Customers inactive for a period
          "problematic", // Customers with complaints or difficult behavior
        ],
        trim: true,
        lowercase: true,
        // Additional classification tags
      },
    ],

    // source of registration (walk-in, phone, etc.)
    source: {
      type: String,
      enum: ["phone", "walk_in", "whatsapp", "facepage", "", "other"],
      default: "phone",
      // How the customer was registered
    },
    // 🔹 Notes / Remarks
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      // General notes about the customer
    },

    // 🔹 Metadata / Audit
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
      // Employee who created this record
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
      // Last employee who updated this record
    },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
    // Soft delete tracking
  },
  { timestamps: true },
);

// 🔹 Indexes
offlineCustomerSchema.index(
  { phone: 1, brand: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } },
);
offlineCustomerSchema.index({ "addresses.location": "2dsphere" }); // For geospatial queries

export default mongoose.model("OfflineCustomer", offlineCustomerSchema);
