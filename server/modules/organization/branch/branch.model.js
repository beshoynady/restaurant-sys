import mongoose from "mongoose";
const { Schema } = mongoose;

const multilingualStringSchema = {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
};

const branchSchema = new Schema(
  {
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

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

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      required: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    address: {
      country: multilingualStringSchema,
      city: multilingualStringSchema,
      area: multilingualStringSchema,
      street: multilingualStringSchema,
      building: multilingualStringSchema,
      floor: multilingualStringSchema,
      landmark: multilingualStringSchema,
    },

    // GEO LOCATION (Google Maps)
    //
    // No defaults on `type`/`coordinates`: a `[0, 0]` default used to be set
    // here, which is a *valid* GeoJSON point (Gulf of Guinea) — every branch
    // created without a real address would silently match "nearest branch"
    // ($near) queries as if it were actually located there, corrupting
    // delivery/geo features. Leaving both undefined means a branch with no
    // location set simply has no `location` field at all, which the
    // `location: "2dsphere"` index below correctly excludes from $near
    // results — a missing location, not a fake real-world one.
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    isMainBranch: {
      type: Boolean,
      default: false,
    },

    openingDate: {
      type: Date,
      default: null,
    },

    // Manager reference for branch-level management and permissions
    manager: {
      type: Schema.Types.ObjectId,
      ref: "UserAccount",
    },

    // Duplicates Brand.companyRegister/Brand.taxIdNumber by design, not by
    // accident — franchise/multi-entity chains legitimately register
    // individual branches as separate legal entities with their own tax ID.
    // Authority rule: if set, THIS branch's value is what invoicing/legal
    // documents for orders at this branch must use; if unset, Brand's
    // value applies. No code currently reads either for invoicing (Sales
    // domain gap, not an Organization one) — recorded here so that future
    // implementation doesn't have to rediscover which one wins.
    taxIdentificationNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    commercialRegisterNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "under_maintenance"],
      default: "active",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount" },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// GEO INDEX (2dsphere) — required for $near queries in branch.service.js
branchSchema.index({ location: "2dsphere" });

branchSchema.index({ brand: 1 });
branchSchema.index({ slug: 1, brand: 1 }, { unique: true });
branchSchema.index({ "name.$**": 1 });
branchSchema.index({ status: 1 });
// `code` is described (integration lookups) as an alternate key but had no
// uniqueness constraint at all. `sparse: true` on a COMPOUND index only
// excludes a document missing ALL indexed fields, not just `code` — since
// `brand` is always present, two branches in the same brand with no `code`
// both indexed as {brand, code: null} and collided (BACKEND_FOUNDATION_TECH_DEBT.md
// FT-003 — flagged as a likely latent bug there, now confirmed empirically
// while testing the HR domain's Shift module, which needs two branches to
// exist in the same brand). partialFilterExpression is the correct fix,
// same pattern already applied to hr/department and hr/job-title.
branchSchema.index(
  { brand: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $exists: true, $type: "string" } } },
);
// One main branch per brand is enforced in the service layer (Mongoose can't
// express "unique when isMainBranch=true" as a plain index without a partial
// filter that breaks on the false case for every other branch).
branchSchema.index(
  { brand: 1, isMainBranch: 1 },
  { unique: true, partialFilterExpression: { isMainBranch: true } },
);

const Branch = mongoose.model("Branch", branchSchema);

export default Branch;
