import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Loyalty Settings
 * ----------------
 * Defines the loyalty program configuration for a brand.
 */

const loyaltySettingsSchema = new mongoose.Schema(
  {
    // Each brand has its own loyalty configuration
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    // How many points are earned for a specific currency amount
    // Example: currencyAmount = 10, pointsPerCurrency = 1
    // Means: 1 point for every 10 currency units spent
    pointsPerCurrency: {
      type: Number,
      required: true,
      min: 0,
    },
    currencyAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Minimum points required to redeem rewards
    minimumRedeemPoints: {
      type: Number,
      default: 100,
      min: 0,
    },
    // Monetary value of one point
    // Example: 1 point = 0.1 currency
    currencyPerPoint: {
      type: Number,
      required: true,
      min: 0,
    },
    // Points expiration period (0 = never expire)
    expirePointsAfterMonths: {
      type: Number,
      default: 24,
      min: 0,
    },
    // Maximum points that can be earned per order to prevent abuse 
    maxPointsPerOrder: {
      type: Number,
      default: 500,
      min: 0,
    },
    // Maximum percentage of order total that can be redeemed with points (0-100)
    maxRedeemPercentage: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Loyalty tiers based on accumulated points
    tiers: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20,
          },
          minPoints: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      default: [
        { name: "regular", minPoints: 0 },
        { name: "silver", minPoints: 100 },
        { name: "gold", minPoints: 500 },
        { name: "vip", minPoints: 1000 },
      ],
    },
    // Whether the loyalty program is active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional welcome bonus points for new customers
    welcomeBonusPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional birthday bonus points
    birthdayBonusPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional referral bonus points
    referralBonusPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Audit fields
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
  },
);

loyaltySettingsSchema.index({ brand: 1 }, { unique: true });

export default mongoose.model("LoyaltySettings", loyaltySettingsSchema);
