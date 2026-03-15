import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * PaymentChannel
 * --------------
 * Represents NON-CASH payment methods:
 * - POS terminals
 * - Wallets
 * - Payment gateways
 * - Collection companies
 */

const paymentChannelSchema = new mongoose.Schema({
  brand: { type: ObjectId, ref: "Brand", required: true },
  branch: { type: ObjectId, ref: "Branch", default: null },

  name: { type: Map, of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 required: true },

  code: { type: String, required: true, unique: true },

  type: {
    type: String,
    enum: ["POS", "WALLET", "GATEWAY", "COLLECTION", "OTHER"],
    required: true,
  },

  providerName: {
    type: String, // Fawry, Paymob, Vodafone, mobile wallet name, etc.
    trim: true,
    maxlength: 100,
    required: true,
  },

  /* =============================
       Accounting Configuration
    ============================== */
  /**
   * Temporary clearing account
   * Used before settlement (especially for cards & wallets)
   */
  
  clearingAccount: {
    type: ObjectId,
    ref: "Account",
    },

  /**
   * Final settlement account (e.g. bank account)
   * Optional for cash payments
   */
  settlementAccount: {
    type: ObjectId,
    ref: "Account",
    default: null,
  },

  /**
   * Account used to record processing fees
   */
  feeAccount: {
    type: ObjectId,
    ref: "Account",
    default: null,
  },

  /**
   * Automatically generate accounting journal entries
   */
  autoPost: {
    type: Boolean,
    default: true,
  },

  /**
   * Indicates whether this payment method requires settlement
   * Typically true for cards, wallets, and gateways
   */
  requiresSettlement: {
    type: Boolean,
    default: function () {
      return ["Card", "MobileWallet", "OnlineGateway"].includes(
        this.paymentCategory,
      );
    },
  },

  settlementDelayDays: {
    type: Number,
    default: 0,
  },

  feesPercentage: { type: Number, default: 0 },
  feesFixed: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },

  createdBy: { type: ObjectId, ref: "Employee", required: true },
  updatedBy: { type: ObjectId, ref: "Employee" },
});

paymentChannelSchema.index({ brand: 1, branch: 1, code: 1 }, { unique: true });

const PaymentChannelModel = mongoose.model(
  "PaymentChannel",
  paymentChannelSchema,
);

export default PaymentChannelModel;
