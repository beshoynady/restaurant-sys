// modules/core/brand-settings/brand-settings.model.js

import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const moduleSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const brandSettingsSchema = new mongoose.Schema(
  {
    // =====================================================
    // BRAND REFERENCE
    // =====================================================

    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      unique: true,
      index: true,
    },

    // =====================================================
    // SYSTEM MODULES
    // Controls available modules across the brand
    // =====================================================

    modules: {
      // Core Modules
      menu: {
        type: moduleSchema,
        default: () => ({ enabled: true }),
      },

      sales: {
        type: moduleSchema,
        default: () => ({ enabled: true }),
      },

      preparation: {
        type: moduleSchema,
        default: () => ({ enabled: true }),
      },

      seating: {
        type: moduleSchema,
        default: () => ({ enabled: true }),
      },

      payments: {
        type: moduleSchema,
        default: () => ({ enabled: true }),
      },

      // Optional Modules

      delivery: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      inventory: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      crm: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      loyalty: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      hr: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      // Enterprise Modules

      accounting: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      purchasing: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      production: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },

      assets: {
        type: moduleSchema,
        default: () => ({ enabled: false }),
      },
    },

    // =====================================================
    // SYSTEM FLAGS
    // =====================================================

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // =====================================================
    // SECURITY SETTINGS
    // Global system restrictions
    // =====================================================

    security: {
      allowMultipleSessions: {
        type: Boolean,
        default: true,
      },

      sessionTimeoutMinutes: {
        type: Number,
        default: 120,
        min: 15,
        max: 1440,
      },
    },

    // =====================================================
    // AUDIT
    // =====================================================

    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================================
// INDEXES
// =====================================================

brandSettingsSchema.index({ brand: 1 }, { unique: true });

const BrandSettings = mongoose.model("BrandSettings", brandSettingsSchema);

export default BrandSettings;
