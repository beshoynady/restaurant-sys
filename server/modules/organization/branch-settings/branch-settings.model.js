import mongoose from "mongoose";
const { Schema } = mongoose;

const phoneSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 50 },
    number: { type: String, trim: true, maxlength: 20, required: true },
  },
  { _id: false },
);

const serviceSchema = new Schema({ enabled: { type: Boolean, default: true } }, { _id: false });

const deliveryServiceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    estimatedTimeMinutes: { type: Number, default: 30, min: 0 },
  },
  { _id: false },
);

const pauseSchema = new Schema(
  {
    from: { type: String, trim: true, required: true },
    to: { type: String, trim: true, required: true },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const periodServiceOverrideSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    openTime: { type: String, trim: true, default: null },
    closeTime: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const periodSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 50 },
    openTime: { type: String, required: true, trim: true },
    closeTime: { type: String, required: true, trim: true },
    // Per-service override within this period (e.g. delivery closes earlier
    // than dine-in during the same period). Falls back to the period's own
    // openTime/closeTime when a field is null.
    services: {
      dineIn: { type: periodServiceOverrideSchema, default: () => ({}) },
      takeaway: { type: periodServiceOverrideSchema, default: () => ({}) },
      delivery: { type: periodServiceOverrideSchema, default: () => ({}) },
    },
    // Temporary closures within this period (e.g. kitchen break).
    pauses: { type: [pauseSchema], default: [] },
  },
  { _id: false },
);

const operatingDaySchema = new Schema(
  {
    day: {
      type: String,
      enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      required: true,
    },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    periods: { type: [periodSchema], default: [] },
  },
  { _id: false },
);

const branchSettingsSchema = new Schema(
  {
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      unique: true,
      index: true,
    },

    contact: {
      phones: { type: [phoneSchema], default: [] },
      whatsapp: { type: String, trim: true, maxlength: 20 },
      // Previously no format validation, inconsistent with Employee's
      // equivalent contact-email field elsewhere in the project. Bare
      // RegExp (not Mongoose's [regex, message] tuple form) — joiFactory's
      // buildFieldValidator reads `field.options.match` directly into
      // Joi's `.pattern()`, which requires a RegExp, not an array.
      email: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 100,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    },

    // Duplicates Brand.timezone by design, not by accident — a multi-branch
    // brand may legitimately span timezones. Authority rule: this branch's
    // value is authoritative for its own operating-hours calculations
    // (branch-settings.service.js#getLocalDayAndTime reads this field
    // directly); Brand.timezone is only ever a creation-time default,
    // never consulted at read time once a branch has its own settings doc.
    timezone: { type: String, trim: true, default: "Africa/Cairo", maxlength: 100 },

    operatingHours: { type: [operatingDaySchema], default: [] },

    services: {
      dineIn: { type: serviceSchema, default: () => ({ enabled: true }) },
      takeaway: { type: serviceSchema, default: () => ({ enabled: true }) },
      delivery: { type: deliveryServiceSchema, default: () => ({ enabled: false }) },
    },

    reservation: {
      enabled: { type: Boolean, default: false },
      advanceBookingDays: { type: Number, default: 30, min: 0 },
      maxGuestsPerReservation: { type: Number, default: 10, min: 1 },
    },

    // Displayed in public menu
    features: {
      type: [
        {
          type: String,
          enum: [
            "wifi",
            "parking",
            "outdoor_seating",
            "family_section",
            "wheelchair_accessible",
            "kids_friendly",
            "prayer_area",
            "air_conditioning",
            "smoking_area",
            "live_music",
            "pet_friendly",
            "valet_parking",
          ],
        },
      ],
      default: [],
    },

    policies: {
      acceptsOnlinePayment: { type: Boolean, default: false },
      acceptsCashOnDelivery: { type: Boolean, default: true },
      supportsLoyaltyProgram: { type: Boolean, default: false },
      supportsGiftCards: { type: Boolean, default: false },
    },

    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },

    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

branchSettingsSchema.index({ branch: 1 }, { unique: true });
branchSettingsSchema.index({ brand: 1 });
branchSettingsSchema.index({ status: 1 });

const BranchSettings = mongoose.model("BranchSettings", branchSettingsSchema);

export default BranchSettings;
