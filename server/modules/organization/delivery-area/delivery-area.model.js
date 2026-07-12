import mongoose from "mongoose";
const { Schema } = mongoose;

const multilingualStringSchema = {
  type: Map,
  of: { type: String, trim: true, maxlength: 100 },
};

const deliveryAreaSchema = new Schema(
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
    // Polygon only — GeoJSON has no native "Circle" type (MongoDB's
    // equivalent, $centerSphere, takes legacy [lng,lat] pairs, not GeoJSON,
    // and can't share a 2dsphere index/query path with this Polygon field).
    // A circle-zone type would need its own separate field/index and
    // $geoWithin query path — deferred until there's a concrete need,
    // rather than building a parallel zone type speculatively now.
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
    // `isActive` boolean (see delivery-area.service.js — a prior version of
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

const DeliveryArea = mongoose.model("DeliveryArea", deliveryAreaSchema);

export default DeliveryArea;
