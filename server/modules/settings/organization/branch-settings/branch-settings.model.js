import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * ====================================================
 * Branch Settings Schema
 * ----------------------------------------------------
 * This schema stores all configurable settings for a branch.
 * It covers:
 * - Contact information
 * - Operating hours & periods
 * - Service availability
 * - Branch features
 * - Policies & options
 * - Audit fields for tracking
 * ====================================================
 */
const branchSettingsSchema = new mongoose.Schema(
  {
    // 🔗 References to Brand and Branch
    brand: { type: ObjectId, ref: "Brand", required: true }, // Link to the parent brand
    branch: { type: ObjectId, ref: "Branch", required: true }, // Link to the specific branch

    // 📞 Contact Information
    contact: {
      phone: [{ type: String, trim: true, maxlength: 20 }], // Branch phone numbers
      whatsapp: { type: String, trim: true, maxlength: 20 }, // WhatsApp contact
      email: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 100,
        match: /\S+@\S+\.\S+/, // Valid email format
      },
    },

    // 🕒 Operating Hours
    operatingHours: [
      {
        day: {
          type: String,
          enum: [
            "Saturday",
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          required: true, // Day of the week
        },
        status: {
          type: String,
          enum: ["open", "closed", "holiday"],
          default: "open", // Open, closed, or holiday status
        },
        periods: [
          {
            name: { type: String, trim: true, maxlength: 50 }, // Period label, e.g., "Morning Shift"
            openTime: { type: String, required: true, trim: true }, // Opening time in HH:mm 24-hour format
            closeTime: { type: String, required: true, trim: true }, // Closing time in HH:mm, can be next day

            // Services availability for this period
            services: {
              dineIn: {
                enabled: { type: Boolean, default: true }, // Enable dine-in service
                openTime: { type: String, trim: true }, // Optional override open time
                closeTime: { type: String, trim: true }, // Optional override close time
              },
              takeaway: {
                enabled: { type: Boolean, default: true },
                openTime: { type: String, trim: true },
                closeTime: { type: String, trim: true },
              },
              delivery: {
                enabled: { type: Boolean, default: true },
                openTime: { type: String, trim: true },
                closeTime: { type: String, trim: true },
                minOrderAmount: { type: Number, default: 0, min: 0 }, // Minimum order for delivery
                estimatedTimeMinutes: { type: Number, default: null, min: 0 }, // Estimated delivery time
              },
            },

            // Temporary pauses/breaks
            pauses: [
              {
                reason: { type: String, trim: true, maxlength: 100 }, // Reason for break
                from: { type: String, trim: true }, // Start time of pause
                to: { type: String, trim: true },   // End time of pause
              },
            ],
          },
        ],
      },
    ],

    // ⭐ Branch Features
    features: [
      {
        name: {
          type: String,
          enum: [
            "WiFi",
            "Parking",
            "Outdoor Seating",
            "Wheelchair Accessible",
            "Live Music",
            "Pet Friendly",
            "Kids Friendly",
            "Air Conditioning",
            "Smoking Area",
            "Live Sports",
            "Gaming Zone",
            "Other",
          ],
          required: true, // Feature type
        },
        enabled: { type: Boolean, default: true }, // Whether feature is active
        description: { type: String, trim: true, maxlength: 150 }, // Optional description of feature
        iconUrl: { type: String, trim: true, maxlength: 200 }, // Optional icon image
      },
    ],

    // 🧾 Services & Policies
    usesReservationSystem: { type: Boolean, default: false }, // Whether branch uses reservation system
    hasPrivateDining: { type: Boolean, default: false },      // Private dining available
    hasOutdoorSeating: { type: Boolean, default: false },     // Outdoor seating available
    offersCurbsidePickup: { type: Boolean, default: false },  // Curbside pickup option
    offersOnlinePayment: { type: Boolean, default: false },   // Online payment available
    offersCashOnDelivery: { type: Boolean, default: false },  // Cash on delivery option

    isActive: { type: Boolean, default: true }, // General active flag

    // 📝 Audit Fields
    createdBy: { type: ObjectId, ref: "UserAccount", required: true }, // Employee who created
    updatedBy: { type: ObjectId, ref: "UserAccount" },  
    // Soft delete fields for tracking who deleted and when a branch settings document was deleted
    deletedBy: { type: ObjectId, ref: "UserAccount" },                // Employee who deleted
    isDeleted: { type: Boolean, default: false },                  // Soft delete flag
    deletedAt: { type: Date, default: null },                      // Soft delete timestamp
  },
  { timestamps: true } // Automatically add createdAt & updatedAt
);

// Ensure one settings document per branch
branchSettingsSchema.index({ branch: 1 }, { unique: true });

const BranchSettingsModel = mongoose.model(
  "BranchSettings",
  branchSettingsSchema
);

export default BranchSettingsModel;
