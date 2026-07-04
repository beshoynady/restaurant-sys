import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * ================================
 * INVOICE SETTINGS
 * ================================
 * This schema represents all configurable settings
 * for sales invoices at brand or branch level.
 * It supports numbering, header/footer, display options,
 * printing, languages, QR, rounding, and audit.
 */
const invoiceSettingsSchema = new mongoose.Schema(
  {
    // ================================
    // BRAND & BRANCH REFERENCE
    // ================================
    brand: { type: ObjectId, ref: "Brand", required: true }, // Brand this invoice belongs to
    branch: { type: ObjectId, ref: "Branch", default: null }, // Branch-specific settings (null → applies to all)

    // ================================
    // INVOICE NUMBERING
    // ================================
    invoiceSequence: {
      prefix: {
        type: String,
        uppercase: true, // convert to uppercase
        maxlength: 5, // max 5 characters
        default: "INV", // prefix for invoice number
      },
      startNumber: {
        type: Number,
        default: 1,
      },
      padding: {
        type: Number,
        default: 5,
        min: 1,
        max: 10,
      },
      includeDate: {
        type: String,
        enum: ["NONE", "DD", "MM", "YYYY", "YYYYMMDD"],
        default: "NONE",
      },
      separator: {
        type: String,
        default: "-",
        maxlength: 2,
      },
      resetPolicy: {
        type: String,
        enum: ["NONE", "MONTHLY", "YEARLY"],
        default: "YEARLY",
      },
    },

    // ================================
    // HEADER & BRANDING
    // ================================
    logoUrl: {
      type: String,
      maxlength: 300,
      default: "",
    },
    receiptHeader: {
      type: Map,
      of: { type: String, maxlength: 200 },
      default: {},
    },
    receiptFooter: {
      type: Map,
      of: { type: String, maxlength: 200 },
      default: {},
    },

    // ================================
    // DISPLAY OPTIONS
    // ================================
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
    // ================================
    // PRINTING BEHAVIOR
    // ================================
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

    // Charges & fees display
    showServiceCharge: { type: Boolean, default: true },
    showDeliveryFee: { type: Boolean, default: true },
    showTaxDetails: { type: Boolean, default: false },

    // ================================
    // PRINTING BEHAVIOR
    // ================================
    copies: { type: Number, default: 1, min: 1, max: 5 },
    autoPrintOnClose: { type: Boolean, default: true },
    autoPrintOnPayment: { type: Boolean, default: true },

    // ================================
    // LANGUAGE SETTINGS
    // ================================
    primaryLanguage: { type: String, default: "en", maxlength: 5 },
    secondaryLanguage: { type: String, default: null, maxlength: 5 },

    // ================================
    // STYLE & LAYOUT
    // ================================
    fontSize: { type: Number, default: 12, min: 8, max: 20 },
    paperWidth: { type: Number, enum: [58, 80, 100], default: 80 },
    isBoldHeader: { type: Boolean, default: true },

    // ================================
    // QR / DIGITAL OPTIONS
    // ================================
    includeQRCode: { type: Boolean, default: false },
    qrCodeUrl: { type: String, maxlength: 300, default: "" },

    // ================================
    // SYSTEM OPTIONS
    // ================================
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

    // ================================
    // AUDIT
    // ================================
    
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: { type: ObjectId, ref: "UserAccount" },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

// Unique index to avoid duplicate settings per brand/branch
invoiceSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const InvoiceSettings = mongoose.model(
  "InvoiceSettings",
  invoiceSettingsSchema,
);
export default InvoiceSettings;
