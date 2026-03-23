import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Loyalty Reward Schema
 * ---------------------
 * Defines rewards that customers can redeem using loyalty points.
 * Rewards can be discounts, free products, or gifts.
 */

const loyaltyRewardSchema = new mongoose.Schema(
  {
    // Brand that owns the reward
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },
    // Reward display name
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    // Description shown to customers
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    // Points required to redeem this reward
    pointsRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    // Type of reward
    rewardType: {
      type: String,
      enum: ["discount", "product", "gift"],
      required: true,
      index: true,
    },
    // Product reference (used when rewardType = product)
    product: {
      type: ObjectId,
      ref: "Product",
    },
    // Discount value (used when rewardType = discount)
    discountAmount: {
      type: Number,
      min: 0,
    },
    // Optional maximum redemptions per customer
    maxRedemptionsPerCustomer: {
      type: Number,
      min: 0,
    },
    // Optional total redemption limit
    maxTotalRedemptions: {
      type: Number,
      min: 0,
    },
    // Tracks how many times this reward was redeemed
    totalRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional validity window
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Whether the reward is currently active
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Audit fields
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
  },
  {
    timestamps: true,
  },
);

// Index to improve reward lookup per brand
loyaltyRewardSchema.index(
  { brand: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

export default mongoose.model("LoyaltyReward", loyaltyRewardSchema);
