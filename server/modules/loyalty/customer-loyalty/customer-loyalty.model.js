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

    // DB-016: previously the sole identity key for this wallet — phone-number formatting
    // differences between OnlineCustomer/OfflineCustomer records risked creating duplicate
    // wallets, and a customer's phone-number change orphaned their loyalty history. Kept as a
    // denormalized contact field; identity is now the polymorphic {customerType, customer} pair
    // below. Left nullable pending the backfill migration — see
    // scripts/migrations/DB-016-backfill-customer-loyalty-identity.ts.
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    customerType: {
      type: String,
      enum: ["OnlineCustomer", "OfflineCustomer"],
      default: null,
    },

    customer: {
      type: ObjectId,
      refPath: "customerType",
      default: null,
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
// DB-016: the actual identity-uniqueness rule, once a wallet is linked to a resolved customer.
// Sparse so pre-migration documents (customer still null) don't collide with each other.
customerLoyaltySchema.index({ brand: 1, customerType: 1, customer: 1 }, { unique: true, sparse: true });

export default mongoose.model("CustomerLoyalty", customerLoyaltySchema);
