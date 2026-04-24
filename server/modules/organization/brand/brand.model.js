import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const brandSchema = new mongoose.Schema(
  {
    // Multilingual brand name (supports English and Arabic)
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
    },
    /**
     * Brand logo URL
     */
    logo: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    /**
     * Maximum number of branches allowed
     */
    maxBranches: {
      type: Number,
      default: 1,
      min: 1,
      max: 50,
    },

    // ===============================
    // FINANCIAL SETTINGS
    // ===============================
    /**
     * Default currency for the brand
     */
    currency: {
      code: {
        type: String,
        enum: ["USD", "EUR", "GBP", "EGP", "SAR", "AED", "JPY", "CNY"],
        trim: true,
        maxlength: 3,
        default: "EGP",
      },
      symbol: {
        type: String,
        trim: true,
        maxlength: 2,
        default: "£",
      },
      decimalPlaces: {
        type: Number,
        min: 0,
        max: 4,
        default: 2,
      },
    },

    // ===============================
    // LANGUAGE & DASHBOARD SETTINGS
    // ===============================
    dashboardLanguages: {
      type: [String],
      enum: ["EN", "AR", "FR", "ES", "IT", "ZH", "JA", "RU"],
      default: ["EN", "AR"],
    },

    defaultDashboardLanguage: {
      type: String,
      default: "EN",
      required: true,
    },


    // ===============================
    // LEGAL & REGULATORY
    // ===============================
    legalName: {
      type: String,
      trim: true,
      maxlength: 150,
      required: true,
    },
    /**
     * Company registration number
     */
    companyRegister: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /**
     * Tax Identification Number
     */
    taxIdNumber: {
      type: String,
      trim: true,
      maxlength: 100,
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
    },

    /**
     * Setup progress status
     */
    setupStatus: {
      type: String,
      enum: ["draft", "basic", "complete"],
      default: "draft",
    },

    // Brand status
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: `active`,
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
