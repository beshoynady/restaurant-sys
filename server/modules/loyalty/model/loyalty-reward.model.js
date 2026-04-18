import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * =====================================================
 * Loyalty Rewards
 * -----------------------------------------------------
 * Redeemable items for customers using points
 * =====================================================
 */

const loyaltyRewardSchema = new mongoose.Schema(
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
      default: null,
    },

    /**
     * Multilingual name
     */
    name: {
      type: Map,
      of: String,
      required: true,
    },

    /**
     * Multilingual description
     */
    description: {
      type: Map,
      of: String,
      required: true,
    },

    pointsRequired: {
      type: Number,
      required: true,
      min: 1,
    },

    rewardType: {
      type: String,
      enum: ["discount", "product", "gift"],
      required: true,
      index: true,
    },

    product: {
      type: ObjectId,
      ref: "Product",
    },

    discountAmount: Number,

    maxRedemptionsPerCustomer: Number,
    maxTotalRedemptions: Number,

    totalRedemptions: {
      type: Number,
      default: 0,
    },

    startDate: Date,
    endDate: Date,

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

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
  { timestamps: true }
);

/**
 * Index for fast queries (NOT unique)
 */
loyaltyRewardSchema.index({ brand: 1, isActive: 1 });

export default mongoose.model("LoyaltyReward", loyaltyRewardSchema);