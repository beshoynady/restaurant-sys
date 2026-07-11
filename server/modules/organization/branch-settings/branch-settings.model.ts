import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BranchSettingsStatus = "active" | "inactive" | "suspended";
export type OperatingDayName =
  | "Saturday"
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";
export type ServiceType = "dineIn" | "takeaway" | "delivery";

export interface IPhone {
  label?: string;
  number: string;
}

export interface IService {
  enabled: boolean;
}

export interface IDeliveryService extends IService {
  minOrderAmount: number;
  estimatedTimeMinutes: number;
}

export interface IPause {
  from: string;
  to: string;
  reason?: string;
}

export interface IPeriodServiceOverride {
  enabled: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface IPeriod {
  name?: string;
  openTime: string;
  closeTime: string;
  services?: {
    dineIn?: IPeriodServiceOverride;
    takeaway?: IPeriodServiceOverride;
    delivery?: IPeriodServiceOverride;
  };
  pauses?: IPause[];
}

export interface IOperatingDay {
  day: OperatingDayName;
  status: "open" | "closed";
  periods: IPeriod[];
}

export interface IBranchSettings extends Document {
  brand: Types.ObjectId;
  branch: Types.ObjectId;
  contact: {
    phones: IPhone[];
    whatsapp?: string;
    email?: string;
  };
  timezone: string;
  operatingHours: IOperatingDay[];
  services: {
    dineIn: IService;
    takeaway: IService;
    delivery: IDeliveryService;
  };
  reservation: {
    enabled: boolean;
    advanceBookingDays: number;
    maxGuestsPerReservation: number;
  };
  features: string[];
  policies: {
    acceptsOnlinePayment: boolean;
    acceptsCashOnDelivery: boolean;
    supportsLoyaltyProgram: boolean;
    supportsGiftCards: boolean;
  };
  status: BranchSettingsStatus;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const phoneSchema = new Schema<IPhone>(
  {
    label: { type: String, trim: true, maxlength: 50 },
    number: { type: String, trim: true, maxlength: 20, required: true },
  },
  { _id: false },
);

const serviceSchema = new Schema<IService>(
  { enabled: { type: Boolean, default: true } },
  { _id: false },
);

const deliveryServiceSchema = new Schema<IDeliveryService>(
  {
    enabled: { type: Boolean, default: false },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    estimatedTimeMinutes: { type: Number, default: 30, min: 0 },
  },
  { _id: false },
);

const pauseSchema = new Schema<IPause>(
  {
    from: { type: String, trim: true, required: true },
    to: { type: String, trim: true, required: true },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const periodServiceOverrideSchema = new Schema<IPeriodServiceOverride>(
  {
    enabled: { type: Boolean, default: true },
    openTime: { type: String, trim: true, default: null },
    closeTime: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const periodSchema = new Schema<IPeriod>(
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

const operatingDaySchema = new Schema<IOperatingDay>(
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

const branchSettingsSchema = new Schema<IBranchSettings>(
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
      email: { type: String, lowercase: true, trim: true, maxlength: 100 },
    },

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

const BranchSettings: Model<IBranchSettings> = mongoose.model<IBranchSettings>(
  "BranchSettings",
  branchSettingsSchema,
);

export default BranchSettings;
