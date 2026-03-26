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

  name: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 1000,
           },
},

    ],

  code: { type: String, required: true, unique: true },

  type: {
    type: String,
    enum: ["POS", "WALLET", "GATEWAY", "COLLECTION", "OTHER"],
    required: true,
  },

  providerName: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
           },
},

    ],

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

  createdBy: { type: ObjectId, ref: "UserAccount", required: true },
  updatedBy: { type: ObjectId, ref: "UserAccount" },
});

paymentChannelSchema.index({ brand: 1, branch: 1, code: 1 }, { unique: true });

const PaymentChannelModel = mongoose.model(
  "PaymentChannel",
  paymentChannelSchema,
);

export default PaymentChannelModel;
