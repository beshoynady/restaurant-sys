import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * =====================================================
 * Loyalty Transactions Ledger
 * -----------------------------------------------------
 * Tracks all points movements:
 * earn / redeem / adjust / expire
 * =====================================================
 */

const loyaltyTransactionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    customerLoyalty: {
      type: ObjectId,
      ref: "CustomerLoyalty",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["earn", "redeem", "adjustment", "expiration"],
      required: true,
      index: true,
    },

    reward: {
      type: ObjectId,
      ref: "LoyaltyReward",
      default: null,
    },

    /**
     * Positive for earn, negative for redeem
     */
    points: {
      type: Number,
      required: true,
    },

    balanceAfter: {
      type: Number,
      required: true,
    },

    order: {
      type: ObjectId,
      ref: "Order",
    },

    expirationDate: Date,

    isUsed: {
      type: Boolean,
      default: false,
    },

    note: {
      type: String,
      maxlength: 300,
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
 * Fast history lookup
 */
loyaltyTransactionSchema.index({
  customerLoyalty: 1,
  createdAt: -1,
});

export default mongoose.model(
  "LoyaltyTransaction",
  loyaltyTransactionSchema
);