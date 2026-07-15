// DATABASE_IMPLEMENTATION_PLAN.md DB-007: `lastResetDate` converted from `String` ("YYYY-MM-DD")
// to `Date`, matching the same fix applied everywhere else date-comparison logic needs to be
// reliable rather than string-comparison-based.
//
// Converted from TypeScript to plain JavaScript at the user's explicit request (CLAUDE.md notes
// this as a deliberate exception to the project's TS-going-forward policy for this module) — the
// `IOrderSettings`/`IOrderSequence` interfaces are dropped; schema/behavior is unchanged.
import mongoose from "mongoose";
const { Schema } = mongoose;

const orderSettingsSchema = new Schema(
  {
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },

    // Order numbering settings
    orderSequence: {
      prefix: { type: String, default: "ORD-" },
      currentNumber: { type: Number, default: 1 },
      // DB-007: was `String` ("YYYY-MM-DD") — string comparison for date-reset logic is
      // error-prone; a real Date lets the atomic reset query use `$lt`/`$gte` correctly.
      lastResetDate: { type: Date, default: null },
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

    // Order cancellation rules
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
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },

    isActive: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// Ensure unique per brand/branch
orderSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const OrderSettingsModel =
  mongoose.models.OrderSettings || mongoose.model("OrderSettings", orderSettingsSchema);

export default OrderSettingsModel;
