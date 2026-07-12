import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IModuleToggle {
  enabled: boolean;
}

export interface IBrandModules {
  menu: IModuleToggle;
  sales: IModuleToggle;
  preparation: IModuleToggle;
  seating: IModuleToggle;
  payments: IModuleToggle;

  delivery: IModuleToggle;
  inventory: IModuleToggle;
  crm: IModuleToggle;
  loyalty: IModuleToggle;
  hr: IModuleToggle;

  financial: IModuleToggle;
  accounting: IModuleToggle;
  analytics: IModuleToggle;
  purchasing: IModuleToggle;
  production: IModuleToggle;
  assets: IModuleToggle;
  reservations: IModuleToggle;
  feedback: IModuleToggle;
}

export type BrandModuleKey = keyof IBrandModules;

export interface IBrandSettings extends Document {
  brand: Types.ObjectId;

  seo: {
    metaTitle?: Map<string, string>;
    metaDescription?: Map<string, string>;
    keywords?: Map<string, string[]>;
    ogTitle?: Map<string, string>;
    ogDescription?: Map<string, string>;
    ogImageUrl?: string | null;
  };

  socialMedia: {
    facebook?: string;
    instagram?: string;
    x?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };

  modules: IBrandModules;

  maintenanceMode: boolean;

  security: {
    allowMultipleSessions: boolean;
    sessionTimeoutMinutes: number;
  };

  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  deletedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Used for enabling/disabling system modules per brand (Feature Toggle / Settings Driven Architecture). */
const moduleSchema = new Schema<IModuleToggle>(
  { enabled: { type: Boolean, default: false } },
  { _id: false },
);

/** Multilingual string — supports EN/AR/any language key via Map. */
const multilingualString = {
  type: Map,
  of: { type: String, trim: true, maxlength: 255 },
};

const brandSettingsSchema = new Schema<IBrandSettings>(
  {
    brand: {
      type: Schema.Types.ObjectId,
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
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount" },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount" },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const BrandSettings: Model<IBrandSettings> = mongoose.model<IBrandSettings>(
  "BrandSettings",
  brandSettingsSchema,
);

export default BrandSettings;
