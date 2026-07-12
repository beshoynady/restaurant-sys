import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { SUPPORTED_LANGUAGES } from "../../../utils/languages.js";

export type BrandStatus = "active" | "inactive" | "suspended";
export type BrandSetupStatus = "draft" | "basic" | "complete";
export type BrandBusinessType =
  | "restaurant"
  | "cafe"
  | "fast_food"
  | "bakery"
  | "food_truck"
  | "cloud_kitchen"
  | "bar"
  | "other";
export type BrandCuisineType =
  | "arabic"
  | "italian"
  | "mexican"
  | "asian"
  | "american"
  | "mediterranean"
  | "fusion";

export interface IBrand extends Document {
  name: Map<string, string>;
  slug: string;
  logo?: string | null;
  businessType: BrandBusinessType;
  cuisineType: BrandCuisineType[];
  maxBranches: number;
  currency: string;
  decimalPlaces: number;
  dashboardLanguages: string[];
  defaultDashboardLanguage: string;
  legalName: string;
  companyRegister?: string;
  taxIdNumber?: string;
  timezone: string;
  countryCode: string;
  setupStatus: BrandSetupStatus;
  status: BrandStatus;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedBy?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
  {
    // Multilingual brand name (Map so any of the platform's supported
    // languages can be used, not just EN/AR — see utils/languages.js)
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

    // Slug for URL and internal references. Globally unique — Brand is the
    // tenant root, so unlike every lower-level model in this module (Branch,
    // DeliveryArea, ...) there is no higher scope to qualify it by.
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      maxlength: 100,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    logo: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    businessType: {
      type: String,
      enum: [
        "restaurant",
        "cafe",
        "fast_food",
        "bakery",
        "food_truck",
        "cloud_kitchen",
        "bar",
        "other",
      ],
      default: "restaurant",
    },

    cuisineType: {
      type: [String],
      enum: ["arabic", "italian", "mexican", "asian", "american", "mediterranean", "fusion"],
      default: ["arabic"],
    },

    // Subscription/plan concern living on the core identity document for now
    // — see the Organization domain review (this session) for why this
    // should eventually move to a dedicated Subscription/Plan module. Not
    // relocated in this pass: that's a schema/ownership change, out of scope
    // for a structural (Repository Pattern + TS) modernization pass.
    maxBranches: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ===============================
    // FINANCIAL SETTINGS
    // ===============================
    currency: {
      type: String,
      enum: [
        "USD",
        "EUR",
        "GBP",
        "EGP",
        "SAR",
        "AED",
        "JPY",
        "CNY",
        "INR",
        "BRL",
        "ZAR",
        "TRY",
        "RUB",
        "KRW",
        "NGN",
        "MXN",
      ],
      trim: true,
      maxlength: 3,
      default: "EGP",
    },

    decimalPlaces: {
      type: Number,
      min: 0,
      max: 4,
      default: 2,
    },

    // ===============================
    // LANGUAGE & DASHBOARD SETTINGS
    // ===============================
    dashboardLanguages: {
      type: [String],
      enum: SUPPORTED_LANGUAGES,
      default: ["EN", "AR"],
    },

    defaultDashboardLanguage: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
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

    companyRegister: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    taxIdNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // ===============================
    // OPERATIONAL SETTINGS
    // ===============================
    timezone: {
      type: String,
      default: "Africa/Cairo",
      maxlength: 100,
    },

    countryCode: {
      type: String,
      default: "EG",
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
    },

    setupStatus: {
      type: String,
      enum: ["draft", "basic", "complete"],
      default: "draft",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    // ===============================
    // AUDIT & SOFT DELETE
    // ===============================
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Multilingual brand name search
brandSchema.index({ "name.$**": 1 });

const Brand: Model<IBrand> = mongoose.model<IBrand>("Brand", brandSchema);

export default Brand;
