import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type DeliveryAreaStatus = "active" | "inactive" | "suspended";
export type DeliveryPricingType = "fixed" | "distance_based";

export interface MultilingualText {
  EN?: string;
  AR?: string;
  [lang: string]: string | undefined;
}

export interface IGeoPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface IDeliveryArea extends Document {
  brand: Types.ObjectId;
  branch: Types.ObjectId;

  name: MultilingualText;
  slug?: string;
  code?: string;

  pricingType: DeliveryPricingType;
  deliveryFee: number;
  minimumOrderAmount: number;
  freeDeliveryThreshold: number | null;

  estimatedDeliveryTimeMinutes: number;
  maxDeliveryDistanceKm: number | null;

  acceptsCashOnDelivery: boolean;
  acceptsOnlinePayment: boolean;

  coverageArea: IGeoPolygon;

  priority: number;
  sortOrder: number;

  notes?: MultilingualText;

  status: DeliveryAreaStatus;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const multilingualStringSchema = {
  type: Map,
  of: { type: String, trim: true, maxlength: 100 },
};

const deliveryAreaSchema = new Schema<IDeliveryArea>(
  {
    // REFERENCES
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    // IDENTITY
    name: multilingualStringSchema,
    slug: { type: String, trim: true, lowercase: true, maxlength: 150 },
    code: { type: String, trim: true, uppercase: true, maxlength: 30 },

    // DELIVERY PRICING
    pricingType: { type: String, enum: ["fixed", "distance_based"], default: "fixed" },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    minimumOrderAmount: { type: Number, default: 0, min: 0 },
    freeDeliveryThreshold: { type: Number, default: null, min: 0 },

    // DELIVERY LIMITS
    estimatedDeliveryTimeMinutes: { type: Number, default: 30, min: 0 },
    maxDeliveryDistanceKm: { type: Number, default: null, min: 0 },

    // PAYMENT OPTIONS
    acceptsCashOnDelivery: { type: Boolean, default: true },
    acceptsOnlinePayment: { type: Boolean, default: true },

    // GEO COVERAGE
    coverageArea: {
      type: { type: String, enum: ["Polygon"], default: "Polygon" },
      coordinates: { type: [[[Number]]], required: true },
    },

    // DISPLAY & PRIORITY
    priority: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },

    // PUBLIC INFO
    notes: multilingualStringSchema,

    // STATUS — the only "is this area usable" field; there is no separate
    // `isActive` boolean (see delivery-area.service.ts — a prior version of
    // this service read a nonexistent `isActive` field and treated every
    // area as inactive).
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },

    // AUDIT
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// INDEXES
deliveryAreaSchema.index({ coverageArea: "2dsphere" });
deliveryAreaSchema.index({ branch: 1, priority: 1 });
// Compound index matching the actual "active areas for my branch" query
// shape used by getActiveAreasByBranch() (brand + branch + status), instead
// of relying on the looser {branch, status} index alone.
deliveryAreaSchema.index({ brand: 1, branch: 1, status: 1 });
deliveryAreaSchema.index({ branch: 1, code: 1 }, { unique: true, sparse: true });
deliveryAreaSchema.index({ "name.$**": 1 });
deliveryAreaSchema.index({ branch: 1, slug: 1 }, { unique: true, sparse: true });

const DeliveryArea: Model<IDeliveryArea> = mongoose.model<IDeliveryArea>(
  "DeliveryArea",
  deliveryAreaSchema,
);

export default DeliveryArea;
