import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const menuSettingsSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null }, // optional branch-level settings

        /**
     * Short description of the brand (multilingual)
     */
    description: { type: Map, of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 maxlength: 500 },

    /**
     * Detailed "About" text for the brand (multilingual)
     */
    aboutText: { type: Map, of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
 maxlength: 2000 },

        /**
     * Brand cover image URL
     */
    coverImage: { type: String },

        /**
     * Official website URL
     */
    website: {
      type: String,
      match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, "Invalid URL"],
    },

    /**
     * Social media links for the brand
     */
    socialMedia: [
      {
        platform: {
          type: String,
          enum: [
            "facebook",
            "instagram",
            "twitter",
            "tiktok",
            "youtube",
            "other",
          ],
        },
        url: {
          type: String,
          match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, "Invalid URL"],
        },
      },
    ],


        /**
     * Supported languages for the menu
     */
    menuLanguages: {
      type: [String],
      enum: ["en", "ar", "fr", "es", "de", "it", "zh", "ja", "ru"],
      default: ["en", "ar"],
    },

    /**
     * Default menu language
     */
    defaultMenuLanguage: {
      type: String,
      enum: ["en", "ar", "fr", "es", "de", "it", "zh", "ja", "ru"],
      default: "en",
    },

    // Inventory & availability
    showOutOfStockItems: { type: Boolean, default: false },
    hidePriceForUnavailable: { type: Boolean, default: false },

    // Customizations
    allowCustomNotes: { type: Boolean, default: true },
    allowAddonsWithoutItem: { type: Boolean, default: false },
    maxAddonsPerItem: { type: Number, default: 5 },
    showAddonsPrice: { type: Boolean, default: true },

    // Audit
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🔹 Index to ensure one settings document per brand/branch
menuSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const MenuSettingModel = mongoose.model("MenuSetting", menuSettingsSchema);

export default MenuSettingModel;
