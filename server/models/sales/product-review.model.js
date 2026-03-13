const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * ===============================
 * Product Review Schema
 * ===============================
 * - Only for completed orders
 * - One review per product per order
 * - Supports dine-in (table QR) & delivery
 */
const ProductReviewSchema = new Schema(
  {
    /** Context */
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
    order: {
      type: ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    reviewSource: {
      type: String,
      enum: ["User", "Customer", "Table"],
      required: true,
    },
    referenceId: {
      type: ObjectId,
      refPath: "reviewSource",
      required: true,
      index: true,
    },
    
    /** Relations */
    items: [
      {
        product: {
          type: ObjectId,
          ref: "Product",
          required: true,
          index: true,
        },
        /** Rating */
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
      },
    ],


    // service quality rating
    serviceQuality: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    // comment
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /** Optional linkage to returns */
    relatedSalesReturn: {
      type: ObjectId,
      ref: "SalesReturn",
      default: null,
    },

    /** Moderation */
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    reviewedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    /** Flags */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

/**
 * Performance indexes
 */
ProductReviewSchema.index({ "items.product": 1 });
ProductReviewSchema.index({ brand: 1, branch: 1, status: 1 });
ProductReviewSchema.index({ serviceQuality: -1 });

const ProductReviewModel = mongoose.model("ProductReview", ProductReviewSchema);

module.exports = ProductReviewModel;
