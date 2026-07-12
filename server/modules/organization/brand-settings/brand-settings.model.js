// modules/organization/brand-settings/brand-settings.model.js

import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * Module Toggle Schema
 * Used for enabling/disabling system modules per brand
 */
const moduleSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Multilingual string schema
 * Supports EN/AR/any language keys
 */
const multilingualString = {
  type: Map,
  of: {
    type: String,
    trim: true,
    maxlength: 255,
  },
};

/**
 * Brand Settings Schema
 */
const brandSettingsSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      unique: true,
      index: true,
    },

    // ================= SEO =================
    seo: {
      metaTitle: multilingualString,
      metaDescription: multilingualString,
      keywords: {
        type: Map,
        of: [String],
        default: { en: [], ar: [] },
      },
      ogTitle: multilingualString,
      ogDescription: multilingualString,
      ogImageUrl: { type: String, trim: true, default: null },
    },

    // ================= Social Media =================
    socialMedia: {
      facebook: String,
      instagram: String,
      x: String,
      linkedin: String,
      tiktok: String,
      youtube: String,
    },

    // ================= Modules =================
    modules: {
      menu: { type: moduleSchema, default: () => ({ enabled: true }) },
      sales: { type: moduleSchema, default: () => ({ enabled: true }) },
      preparation: { type: moduleSchema, default: () => ({ enabled: true }) },
      seating: { type: moduleSchema, default: () => ({ enabled: true }) },
      payments: { type: moduleSchema, default: () => ({ enabled: true }) },

      delivery: { type: moduleSchema, default: () => ({ enabled: false }) },
      inventory: { type: moduleSchema, default: () => ({ enabled: false }) },
      crm: { type: moduleSchema, default: () => ({ enabled: false }) },
      loyalty: { type: moduleSchema, default: () => ({ enabled: false }) },
      hr: { type: moduleSchema, default: () => ({ enabled: false }) },

      financial: { type: moduleSchema, default: () => ({ enabled: false }) },
      accounting: { type: moduleSchema, default: () => ({ enabled: false }) },
      analytics: { type: moduleSchema, default: () => ({ enabled: false }) },
      purchasing: { type: moduleSchema, default: () => ({ enabled: false }) },
      production: { type: moduleSchema, default: () => ({ enabled: false }) },
      assets: { type: moduleSchema, default: () => ({ enabled: false }) },
      reservations: { type: moduleSchema, default: () => ({ enabled: false }) },
      feedback: { type: moduleSchema, default: () => ({ enabled: false }) },
    },

    // ================= System =================
    maintenanceMode: { type: Boolean, default: false },

    security: {
      allowMultipleSessions: { type: Boolean, default: true },
      sessionTimeoutMinutes: { type: Number, default: 120, min: 15, max: 1440 },
    },

    // ================= Audit =================
    createdBy: { type: ObjectId, ref: "UserAccount" },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
    deletedBy: { type: ObjectId, ref: "UserAccount" },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("BrandSettings", brandSettingsSchema);
