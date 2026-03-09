const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

/**
 * Customer Loyalty Schema
 * -----------------------
 * Stores loyalty information for a customer
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
      enum: ["regular", "silver", "gold", "vip"],
      default: "regular",
    },

    tierUpdatedAt: {
      type: Date,
    },

    totalEarned: {
      type: Number,
      default: 0,
    },

    totalRedeemed: {
      type: Number,
      default: 0,
    },

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

customerLoyaltySchema.index({ brand: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("CustomerLoyalty", customerLoyaltySchema);
