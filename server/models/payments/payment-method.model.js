import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PaymentMethod Schema
 * --------------------
 * Defines available payment methods for sales, expenses, and other transactions.
 * Supports cash, cards, wallets, gateways, credits, vouchers, and more.
 */
const PaymentMethodSchema = new mongoose.Schema(
  {
    /* =============================
       Ownership & Scope
    ============================== */
    brand: { type: ObjectId, ref: "Brand", required: true },

    branch: { type: ObjectId, ref: "Branch", default: null },

    /* =============================
       Display & Identification
    ============================== */

    /**
     * Localized payment method names
     * Example: { en: "Cash", ar: "نقدي" }
     */
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      required: true,
    },

    /**
     * Payment category (business meaning)
     */
    paymentCategory: {
      type: String,
      enum: [
        "Cash", // Physical cash
        "Card", // POS / debit / credit cards
        "MobileWallet", // Vodafone Cash, Orange, etc.
        "OnlineGateway", // Paymob, Stripe, etc.
        "Credit", // Customer credit / on-account
        "Voucher", // Discount or prepaid voucher
        "GiftCard", // Stored value card
        "Other",
      ],
      required: true,
      trim: true,
    },

    /**
     * Payment execution type
     * Offline: In-store / physical
     * Online: Remote / online
     */
    paymentType: {
      type: String,
      enum: ["Offline", "Online"],
      default: "Offline",
    },

    /* =============================
       POS Behavior
    ============================== */

    /**
     * Indicates whether the cash drawer should open automatically
     * Only applies to offline cash payments
     */
    openCashDrawer: {
      type: Boolean,
      default: function () {
        return (
          this.paymentCategory === "Cash" && this.paymentType === "Offline"
        );
      },
    },

    /**
     * Determines whether an external reference is required
     * Example: transaction ID, authorization code, wallet reference
     */
    requiresReference: {
      type: Boolean,
      default: function () {
        return ["Card", "MobileWallet", "OnlineGateway"].includes(
          this.paymentCategory,
        );
      },
    },

    // Type of the referenced model
    type: {
      type: String,
      enum: ["CashRegister", "PaymentChannel"],
      required: true,
    },

    /// Dynamic reference to either CashRegister or PaymentChannel
    reference: {
      type: ObjectId,
      refPath: "type",
      required: true,
    },

    /**
     * Allows splitting payments across multiple payment methods
     * Example: cash + card
     */
    allowSplit: { type: Boolean, default: true },

    /* =============================
       UI & Behavior
    ============================== */

    /**
     * Icon identifier (e.g., FontAwesome class name)
     */
    icon: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /**
     * Marks this as the default payment method
     * Only one default allowed per brand/branch
     */
    isDefault: { type: Boolean, default: false },

    /**
     * Controls availability of the payment method
     */
    isActive: { type: Boolean, default: true },

    /**
     * Optional notes or description
     */
    notes: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /* =============================
       Audit & Soft Delete
    ============================== */
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Ensure only one default payment method per brand & branch
 */
PaymentMethodSchema.index(
  { brand: 1, branch: 1, isDefault: 1 },
  { partialFilterExpression: { isDefault: true } },
);

export default mongoose.model("PaymentMethod", PaymentMethodSchema);
