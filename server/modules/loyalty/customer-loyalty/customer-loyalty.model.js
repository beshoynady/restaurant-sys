import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Customer Loyalty Wallet
 */
const customerLoyaltySchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    tier: {
      type: String,
      default: "regular",
    },

    tierUpdatedAt: Date,

    totalEarned: { type: Number, default: 0 },
    totalRedeemed: { type: Number, default: 0 },

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
  },
  { timestamps: true },
);

customerLoyaltySchema.index({ brand: 1, phone: 1 }, { unique: true });

export default mongoose.model("CustomerLoyalty", customerLoyaltySchema);
