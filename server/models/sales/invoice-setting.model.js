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
        maxlength: 5,    // max 5 characters
        default: "INV",  // prefix for invoice number
        description: "Prefix before invoice number",
      },
      startNumber: {
        type: Number,
        default: 1,
        description: "Starting number for the invoice sequence",
      },
      padding: {
        type: Number,
        default: 5,
        min: 1,
        max: 10,
        description: "Number of digits, e.g., 00001",
      },
      includeDate: {
        type: String,
        enum: ["NONE", "DD", "MM", "YYYY", "YYYYMMDD"],
        default: "NONE",
        description: "Include date in invoice number",
      },
      separator: {
        type: String,
        default: "-",
        maxlength: 2,
        description: "Character(s) separating prefix, date, and number",
      },
      resetPolicy: {
        type: String,
        enum: ["NONE", "MONTHLY", "YEARLY"],
        default: "YEARLY",
        description: "Reset invoice numbering policy",
      },
    },

    // ================================
    // HEADER & BRANDING
    // ================================
    logoUrl: {
      type: String,
      maxlength: 300,
      default: "",
      description: "URL for invoice logo",
    },
    headerText: {
      type: Map,
      of: { type: String, maxlength: 200 },
      default: {},
      description: "Multilingual header text",
    },
    footerText: {
      type: Map,
      of: { type: String, maxlength: 200 },
      default: {},
      description: "Multilingual footer text",
    },

    // ================================
    // DISPLAY OPTIONS
    // ================================
    showInvoiceNumber: { type: Boolean, default: true },
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
      description: "Rounding policy for total amount",
    },

    // ================================
    // AUDIT
    // ================================
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique index to avoid duplicate settings per brand/branch
invoiceSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const InvoiceSettings = mongoose.model("InvoiceSettings", invoiceSettingsSchema);
export InvoiceSettings;
