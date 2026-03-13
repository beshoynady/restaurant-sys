import mongoose from "mongoose";
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * ================================
 * ORDER SETTINGS
 * ================================
 * Configurable rules per brand/branch for orders.
 */
const orderSettingsSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    // Order numbering settings
    orderSequence: {
      prefix: { type: String, default: "ORD-" },
      currentNumber: { type: Number, default: 1 },
      lastResetDate: { type: String, default: null }, // YYYY-MM-DD
      resetDaily: { type: Boolean, default: true },
    },

    // Price & quantity rules
    allowPriceChange: { type: Boolean, default: false },
    allowQuantityChange: { type: Boolean, default: false },

    // Auto-close orders
    autoCloseOrderAfterPayment: { type: Boolean, default: true },
    autoCloseOrderAfterTime: { type: Number, default: 30, min: 1 },

    // Auto-send to kitchen/preparation
    autoSendOrderToPreparationSection: { type: Boolean, default: true },
    autoSendOrderToPreparationAfterTime: { type: Number, default: 5, min: 1 },

    // Edit after sent to kitchen
    allowEditOrderAfterSendToKitchen: { type: Boolean, default: false },

    // Cancelation rules
    requireManagerApprovalForCancel: { type: Boolean, default: true },
    cancelReasonRequired: { type: Boolean, default: true },

    // Payment options
    allowSplitPayment: { type: Boolean, default: true },
    allowPartialPayment: { type: Boolean, default: false },

    // Timing rules
    maxTimeToSendToPreparationSection: { type: Number, default: 10, min: 1 },
    maxTimeToServe: { type: Number, default: 60, min: 1 },

    // Stock validation
    preventNegativeStockOrders: { type: Boolean, default: true },

    // Hold/pending orders
    holdOrdersAllowed: { type: Boolean, default: true },
    maxHoldOrdersPerCashier: { type: Number, default: 5 },
    autoResumeHoldOrder: { type: Boolean, default: false },

    // Tickets rules
    allowRejectTickets: { type: Boolean, default: false },
    autoMergeTickets: { type: Boolean, default: false },

    // Audit
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure unique per brand/branch
orderSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const OrderSettings = model("OrderSettings", orderSettingsSchema);
export default OrderSettings;