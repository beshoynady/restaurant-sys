// DATABASE_IMPLEMENTATION_PLAN.md DB-007: adds `currentNumber`/`lastResetDate` tracking fields to
// `invoiceSequence` — the schema already defined the numbering *policy* (prefix/padding/
// includeDate/separator/resetPolicy) but had nowhere to persist the actual running counter state,
// which is the field an atomic `$inc`-based generator needs to exist at all. Converted to
// TypeScript because this model is now directly consumed by invoice-settings.service.ts's atomic
// generation logic.
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type InvoiceDateComponent = "NONE" | "DD" | "MM" | "YYYY" | "YYYYMMDD";
export type InvoiceResetPolicy = "NONE" | "MONTHLY" | "YEARLY";

export interface IInvoiceSequence {
  prefix: string;
  startNumber: number;
  padding: number;
  includeDate: InvoiceDateComponent;
  separator: string;
  resetPolicy: InvoiceResetPolicy;
  currentNumber: number;
  lastResetDate: Date | null;
}

export interface IInvoiceSettings extends Document {
  brand: Types.ObjectId;
  branch: Types.ObjectId | null;
  invoiceSequence: IInvoiceSequence;
  logoUrl: string;
  receiptHeader: Map<string, string>;
  receiptFooter: Map<string, string>;
  showInvoiceNumber: boolean;
  showBrandName: boolean;
  showBranchName: boolean;
  showBrandLogo: boolean;
  showCustomerName: boolean;
  showCustomerContact: boolean;
  showOrderDetails: boolean;
  showPaymentDetails: boolean;
  showTaxDetails: boolean;
  showServiceCharge: boolean;
  showDeliveryFee: boolean;
  showQRCode: boolean;
  printOnPayment: boolean;
  printOnOrderClose: boolean;
  numberOfCopies: number;
  showDate: boolean;
  showCashier: boolean;
  showTableNumber: boolean;
  showItemsCalories: boolean;
  showSubtotal: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showTotal: boolean;
  showPaymentMethod: boolean;
  showChange: boolean;
  copies: number;
  autoPrintOnClose: boolean;
  autoPrintOnPayment: boolean;
  primaryLanguage: string;
  secondaryLanguage: string | null;
  fontSize: number;
  paperWidth: number;
  isBoldHeader: boolean;
  includeQRCode: boolean;
  qrCodeUrl: string;
  roundingPolicy: "none" | "nearest_0_05" | "nearest_0_1";
  status: "active" | "inactive" | "suspended";
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

const invoiceSettingsSchema = new Schema<IInvoiceSettings>(
  {
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },

    invoiceSequence: {
      prefix: { type: String, uppercase: true, maxlength: 5, default: "INV" },
      startNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 5, min: 1, max: 10 },
      includeDate: {
        type: String,
        enum: ["NONE", "DD", "MM", "YYYY", "YYYYMMDD"],
        default: "NONE",
      },
      separator: { type: String, default: "-", maxlength: 2 },
      resetPolicy: {
        type: String,
        enum: ["NONE", "MONTHLY", "YEARLY"],
        default: "YEARLY",
      },
      // DB-007: previously absent — the actual mutable counter state.
      currentNumber: { type: Number, default: 1 },
      lastResetDate: { type: Date, default: null },
    },

    logoUrl: { type: String, maxlength: 300, default: "" },
    receiptHeader: { type: Map, of: { type: String, maxlength: 200 }, default: {} },
    receiptFooter: { type: Map, of: { type: String, maxlength: 200 }, default: {} },

    showInvoiceNumber: { type: Boolean, default: true },
    showBrandName: { type: Boolean, default: true },
    showBranchName: { type: Boolean, default: true },
    showBrandLogo: { type: Boolean, default: true },
    showCustomerName: { type: Boolean, default: true },
    showCustomerContact: { type: Boolean, default: true },
    showOrderDetails: { type: Boolean, default: true },
    showPaymentDetails: { type: Boolean, default: true },
    showTaxDetails: { type: Boolean, default: false },
    showServiceCharge: { type: Boolean, default: true },
    showDeliveryFee: { type: Boolean, default: true },
    showQRCode: { type: Boolean, default: false },

    printOnPayment: { type: Boolean, default: true },
    printOnOrderClose: { type: Boolean, default: true },
    numberOfCopies: { type: Number, default: 1, min: 1, max: 5 },
    showDate: { type: Boolean, default: true },
    showCashier: { type: Boolean, default: true },
    showTableNumber: { type: Boolean, default: true },
    showItemsCalories: { type: Boolean, default: false },
    showSubtotal: { type: Boolean, default: true },
    showDiscount: { type: Boolean, default: true },
    showTax: { type: Boolean, default: true },
    showTotal: { type: Boolean, default: true },
    showPaymentMethod: { type: Boolean, default: true },
    showChange: { type: Boolean, default: true },

    copies: { type: Number, default: 1, min: 1, max: 5 },
    autoPrintOnClose: { type: Boolean, default: true },
    autoPrintOnPayment: { type: Boolean, default: true },

    primaryLanguage: { type: String, default: "en", maxlength: 5 },
    secondaryLanguage: { type: String, default: null, maxlength: 5 },

    fontSize: { type: Number, default: 12, min: 8, max: 20 },
    paperWidth: { type: Number, enum: [58, 80, 100], default: 80 },
    isBoldHeader: { type: Boolean, default: true },

    includeQRCode: { type: Boolean, default: false },
    qrCodeUrl: { type: String, maxlength: 300, default: "" },

    roundingPolicy: {
      type: String,
      enum: ["none", "nearest_0_05", "nearest_0_1"],
      default: "none",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

invoiceSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const InvoiceSettingsModel: Model<IInvoiceSettings> =
  mongoose.models.InvoiceSettings ||
  mongoose.model<IInvoiceSettings>("InvoiceSettings", invoiceSettingsSchema);

export default InvoiceSettingsModel;
