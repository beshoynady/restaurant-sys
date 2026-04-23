import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Loyalty Settings Schema
 * Brand-level configuration
 */
const loyaltySettingsSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      unique: true,
      index: true,
    },
    // Earning rules (Points per currency unit) and redemption rules (Currency value per point)
    pointsPerCurrency: { type: Number, required: true, min: 0 },
    currencyAmount: { type: Number, required: true, min: 1 },
    // Redemption rules - minimum points to redeem and maximum points per order or percentage of order total that can be redeemed
    minimumRedeemPoints: { type: Number, default: 100, min: 0 },
    currencyPerPoint: { type: Number, required: true, min: 0 },
    // Tier system - points thresholds for each tier and benefits (could be expanded to a separate collection if needed)
    expirePointsAfterMonths: { type: Number, default: 24, min: 0 },
    // Optional limits on points earning and redemption to prevent abuse
    maxPointsPerOrder: { type: Number, default: 500, min: 0 },
    maxRedeemPercentage: { type: Number, default: 50, min: 0, max: 100 },
    // Tier thresholds - can be a map of tier name to points threshold (e.g., regular: 0, silver: 100, gold: 500, vip: 1000)
    tiers: {
      type: Map,
      of: Number,
      default: {
        regular: 0,
        silver: 100,
        gold: 500,
        vip: 1000,
      },
    },
    // Optional bonus points for specific actions (e.g., sign-up, birthday, referrals)
    welcomeBonusPoints: { type: Number, default: 0 },
    birthdayBonusPoints: { type: Number, default: 0 },
    referralBonusPoints: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

// Ensure one settings per brand
loyaltySettingsSchema.index({ brand: 1 }, { unique: true });

export default mongoose.model("LoyaltySettings", loyaltySettingsSchema);
