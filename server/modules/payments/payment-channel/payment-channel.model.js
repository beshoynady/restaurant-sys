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

  // DB-004: field-level `unique: true` removed — uniqueness enforced by the {brand,branch,code} compound index below.
  code: { type: String, required: true },

  type: {
    type: String,
    enum: ["POS", "WALLET", "GATEWAY", "COLLECTION", "OTHER"],
    required: true,
  },

  providerName: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
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
    // DB-004: was referencing `this.paymentCategory`, a field that does not exist on this schema
    // (that field belongs to the sibling PaymentMethod model) — the default always evaluated to
    // `false`. Fixed to reference this schema's own `type` field.
    default: function () {
      return ["POS", "WALLET", "GATEWAY"].includes(this.type);
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
}, { timestamps: true }); // DB-004: this schema previously had no timestamps option at all

paymentChannelSchema.index({ brand: 1, branch: 1, code: 1 }, { unique: true });

const PaymentChannelModel = mongoose.model(
  "PaymentChannel",
  paymentChannelSchema,
);

export default PaymentChannelModel;
