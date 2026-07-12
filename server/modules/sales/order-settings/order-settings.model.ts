// DATABASE_IMPLEMENTATION_PLAN.md DB-007: `lastResetDate` converted from `String` ("YYYY-MM-DD")
// to `Date`, matching the same fix applied everywhere else date-comparison logic needs to be
// reliable rather than string-comparison-based. Converted to TypeScript because this model is now
// directly consumed by the atomic sequence-generation logic in order-settings.service.ts.
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IOrderSequence {
  prefix: string;
  currentNumber: number;
  lastResetDate: Date | null;
  resetDaily: boolean;
}

export interface IOrderSettings extends Document {
  brand: Types.ObjectId;
  branch: Types.ObjectId | null;
  orderSequence: IOrderSequence;
  allowPriceChange: boolean;
  allowQuantityChange: boolean;
  autoCloseOrderAfterPayment: boolean;
  autoCloseOrderAfterTime: number;
  autoSendOrderToPreparationSection: boolean;
  autoSendOrderToPreparationAfterTime: number;
  allowEditOrderAfterSendToKitchen: boolean;
  requireManagerApprovalForCancel: boolean;
  cancelReasonRequired: boolean;
  allowSplitPayment: boolean;
  allowPartialPayment: boolean;
  maxTimeToSendToPreparationSection: number;
  maxTimeToServe: number;
  preventNegativeStockOrders: boolean;
  holdOrdersAllowed: boolean;
  maxHoldOrdersPerCashier: number;
  autoResumeHoldOrder: boolean;
  allowRejectTickets: boolean;
  autoMergeTickets: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

const orderSettingsSchema = new Schema<IOrderSettings>(
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

const OrderSettingsModel: Model<IOrderSettings> =
  mongoose.models.OrderSettings || mongoose.model<IOrderSettings>("OrderSettings", orderSettingsSchema);

export default OrderSettingsModel;
