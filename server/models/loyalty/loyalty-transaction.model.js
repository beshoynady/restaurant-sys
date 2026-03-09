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
    // Type of transaction
    type: {
      type: String,
      type: ["earn", "redeem", "adjustment", "expiration"],
      required: true,
    },
    // Reference to the reward redeemed (if type = redeem)
    reward: {
      type: ObjectId,
      ref: "LoyaltyReward",
    },
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

    expirationDate: {
      type: Date,
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
  { unique: true, partialFilterExpression: { type: "earn" } }
);

module.exports = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);
