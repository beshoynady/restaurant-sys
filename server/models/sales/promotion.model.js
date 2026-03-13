import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Promotion Schema
 * ----------------
 * Represents a promotional offer or discount that can be applied
 * to orders, specific products, or Buy X Get Y promotions
 * within a brand/branch.
 */
const PromotionSchema = new mongoose.Schema(
  {
    // Reference to the brand
    brand: { 
      type: ObjectId, 
      ref: "Brand", 
      required: true, 
      // The brand that owns this promotion
    },

    // Reference to a specific branch (optional)
    branch: { 
      type: ObjectId, 
      ref: "Branch", 
      default: null, 
      // Null = applies to all branches
    },

    // Multilingual promotion name
    name: { 
      type: Map, 
      of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 
      required: true, 
      // Displayed in UI, QR code, and app
    },

    // Scope of the promotion
    appliesTo: {
      type: String,
      uppercase: true,
      enum: ["ORDER", "PRODUCT", "BUY_X_GET_Y"],
      required: true, 
      // ORDER → applies to entire order
      // PRODUCT → applies to specific products
      // BUY_X_GET_Y → Buy X products get Y products
    },

    // Optional promotion image URL for visual representation
    imageUrl: { 
      type: String, 
      trim: true, 
      maxlength: 300, 
      default: null, 
      // Can be displayed on front-end for promotion banner
    },

    // Discount type (percentage or fixed amount)
    type: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
      // Determines calculation method for promotion
    },

    // Percentage discount (if type = PERCENTAGE)
    percentage: { 
      type: Number, 
      min: 0, 
      max: 100, 
      // Value between 0-100%
    },

    // Fixed discount amount (if type = FIXED)
    fixedAmount: { 
      type: Number, 
      min: 0, 
      // Fixed monetary amount to deduct
    },

    // For Buy X Get Y promotions
    xProducts: [
      {
        quantity: { type: Number, min: 1 }, // Quantity customer must buy
        product: { type: ObjectId, ref: "Product" }, // Product to buy
      },
    ],
    yProducts: [
      {
        quantity: { type: Number, min: 1 }, // Quantity customer will get
        product: { type: ObjectId, ref: "Product" }, // Product to receive
      },
    ],

    // Applicable products if appliesTo = PRODUCT
    applicableProducts: [{ 
      type: ObjectId, 
      ref: "Product" 
    }],

    // Minimum order amount to activate promotion
    minOrderAmount: { 
      type: Number, 
      default: 0, 
      // Order must reach this total to apply promotion
    },

    // Determines if promotion is applied automatically without customer action
    autoApply: { 
      type: Boolean, 
      default: false, 
    },

    // Promotion active period
    activeFrom: { type: Date, required: true }, // Start date/time
    activeTo: { type: Date, required: true },   // End date/time

    // Usage limits
    usageLimit: { type: Number },        // Total times promotion can be used
    usagePerCustomer: { type: Number },  // Max usage per customer

    // Promotion status
    isActive: { type: Boolean, default: true },

    // Audit fields
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },
    deletedBy: { type: ObjectId, ref: "Employee" },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for faster querying by brand/branch and active period
PromotionSchema.index({ brand: 1, branch: 1 });
PromotionSchema.index({ activeFrom: 1, activeTo: 1 });

const PromotionModel = mongoose.model("Promotion", PromotionSchema);

export PromotionModel;
