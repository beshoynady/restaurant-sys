import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * Brand Configuration Schema
 * --------------------------
 * This schema represents all brand-level information and settings.
 * It combines basic info, operational settings, currency, and audit fields.
 * Suitable for multi-branch and multi-currency restaurants.
 */
const brandSchema = new mongoose.Schema(
  {
    // ===============================
    // BRAND IDENTIFICATION
    // ===============================
    /**
     * Brand name (multilingual)
     * Displayed in POS, menus, invoices
     * Supports multiple languages using a Map (e.g., { "en": "My Restaurant", "ar": "مطعمي" })
     */
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
          maxlength: 100,
        },
      },
    ],
    /**
     * slug for URL and internal references (auto-generated from English name)
     */
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      maxlength: 100,
      match: /^[a-z]+(?:-[a-z0-9]+)*$/, // allows lowercase letters and hyphens and numbers, but must start with a letter
      description: "URL-friendly identifier for the brand (auto-generated)",
    },
    /**
     * Brand logo URL
     */
    logo: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
      description: "Brand logo for invoices, menus, dashboard",
    },

    /**
     * Maximum number of branches allowed
     */
    maxBranches: {
      type: Number,
      default: 1,
      min: 1,
      max: 50,
      description: "Maximum number of branches this brand can create",
    },

    // ===============================
    // FINANCIAL SETTINGS
    // ===============================
    /**
     * Default currency for the brand
     */
    currency: {
      type: String,
      enum: [
        "USD",
        "SAR",
        "AED",
        "EGP",
        "EUR",
        "GBP",
        "KWD",
        "QAR",
        "OMR",
        "BHD",
        "JPY",
        "CNY",
        "INR",
        "TRY",
        "RUB",
        "AUD",
        "CAD",
        "CHF",
        "SEK",
        "NOK",
        "DKK",
      ],
      default: "EGP",
      description: "Default currency for sales and purchases",
    },

    /**
     * Company registration number
     */
    companyRegister: {
      type: String,
      trim: true,
      maxlength: 100,
      description: "Official company registration number",
    },

    /**
     * Tax Identification Number
     */
    taxIdNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      description: "Tax ID for legal & accounting purposes",
    },

    // ===============================
    // OPERATIONAL SETTINGS
    // ===============================
    /**
     * Default timezone for the brand
     */
    timezone: {
      type: String,
      default: "Africa/Cairo",
      maxlength: 100,
      description: "Timezone for branch operations and reports",
    },

    /**
     * Default country code (ISO 3166-1 alpha-2)
     */
    countryCode: {
      type: String,
      default: "EG",
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
      description: "ISO country code for brand location",
    },

    /**
     * Setup progress status
     */
    setupStatus: {
      type: String,
      enum: ["draft", "basic", "complete"],
      default: "draft",
      description: "Setup progress of brand in the system",
    },

    // Brand status
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: `active`,
      description: "Operational status of the brand",
    },
    // ===============================
    // AUDIT & SOFT DELETE
    // ===============================
    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// 🔹 Index for multilingual brand name search
brandSchema.index({ "name.$**": 1 });

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
