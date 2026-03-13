const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

/**
 * Loyalty Transaction
 * -------------------
 * Tracks every points movement
 */

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    // Each transaction is associated with a brand and branch
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
    // Reference to the customer's loyalty record
    customerLoyalty: {
      type: ObjectId,
      ref: "CustomerLoyalty",
      required: true,
      index: true,
    },
    // Type of transaction (earn, redeem, adjustment, expiration) 
    // - determines how points are calculated and displayed
    type: {
      type: String,
      enum: ["earn", "redeem", "adjustment", "expiration"],
      required: true,
    },
    // Reference to the reward redeemed (if type = redeem)
    reward: {
      type: ObjectId,
      ref: "LoyaltyReward",
    },
    // Points earned or redeemed (positive for earn, negative for redeem)
    points: {
      type: Number,
      required: true,
      min: 1,
    },
    // Points balance after this transaction
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    order: {
      type: ObjectId,
      ref: "Order",
    },
    // Expiration date for earned points (used when type = earn)
    expirationDate: {
      type: Date,
    },
    // used to mark if an earned transaction has been used for redemption
    isUsed: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
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

loyaltyTransactionSchema.index({
  customerLoyalty: 1,
  createdAt: -1,
});

loyaltyTransactionSchema.index(
  { order: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "earn" } },
);

module.exports = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);
