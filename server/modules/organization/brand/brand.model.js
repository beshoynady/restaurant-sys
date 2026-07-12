import mongoose from "mongoose";
import { SUPPORTED_LANGUAGES } from "../../../utils/languages.js";
const { ObjectId } = mongoose.Schema.Types;

const brandSchema = new mongoose.Schema(
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
        "meal_prep",
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
    // — see the Organization domain review for why this should eventually
    // move to a dedicated Subscription/Plan module. Not relocated here:
    // that's a schema/ownership change, out of scope for this pass.
    // Enforced at branch-creation time (branch.service.js) — Business Rule:
    // "A Brand cannot have more branches than its maxBranches plan limit."
    maxBranches: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Reserved SaaS subscription fields — PROJECT_VISION_ar.md §3 lists
    // "اشتراك (Subscription)" as a first-class Brand attribute. No billing
    // logic reads/writes this yet (the platform runs single-brand today);
    // reserved now so the field exists before any real subscription/billing
    // module is built, avoiding a later migration across every Brand
    // document. `plan`/`status` intentionally minimal — expand only when an
    // actual billing integration is built, not speculatively.
    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "professional", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["trialing", "active", "past_due", "canceled"],
        default: "active",
      },
      trialEndsAt: { type: Date, default: null },
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
    // OWNERSHIP
    // ===============================
    // PROJECT_VISION_ar.md §3 lists "Owner" as a first-class Brand
    // attribute. Previously only inferable indirectly via
    // UserAccount.brand + role — no explicit source of truth for "who owns
    // this tenant." Required, but see brand.repository.js/setup.service.js:
    // the bootstrap flow creates Brand before the owner UserAccount exists
    // (a circular reference — UserAccount itself requires `brand`), so the
    // very first save is done with `validateBeforeSave: false` and `owner`
    // is set in a second save once the UserAccount is created, within the
    // same transaction. Every other creation path (e.g. the admin
    // `POST /organization/brand` endpoint) requires an existing owner
    // UserAccount id up front — a Brand is never left ownerless in steady
    // state.
    owner: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
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
    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Multilingual brand name search
brandSchema.index({ "name.$**": 1 });

// Platform-admin brand list is commonly filtered by status (active/suspended).
brandSchema.index({ status: 1 });

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
