import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BranchStatus = "active" | "inactive" | "under_maintenance";

export interface MultilingualText {
  EN?: string;
  AR?: string;
  [lang: string]: string | undefined;
}

export interface BranchAddress {
  country?: MultilingualText;
  city?: MultilingualText;
  area?: MultilingualText;
  street?: MultilingualText;
  building?: MultilingualText;
  floor?: MultilingualText;
  landmark?: MultilingualText;
}

export interface BranchLocation {
  type: "Point";
  coordinates: [number, number];
}

export interface IBranch extends Document {
  brand: Types.ObjectId;
  name: Map<string, string>;
  slug: string;
  code?: string;
  address?: BranchAddress;
  // Optional: a branch without a set location must be absent from geo
  // queries, not silently placed at [0, 0] — see the schema comment below.
  location?: BranchLocation;
  postalCode?: string;
  isMainBranch: boolean;
  manager?: Types.ObjectId;
  taxIdentificationNumber?: string;
  commercialRegisterNumber?: string;
  status: BranchStatus;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const multilingualStringSchema = {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
};

const branchSchema = new Schema<IBranch>(
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

    // Manager reference for branch-level management and permissions
    manager: {
      type: Schema.Types.ObjectId,
      ref: "UserAccount",
    },

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

// GEO INDEX (2dsphere) — required for $near queries in branch.service.ts
branchSchema.index({ location: "2dsphere" });

branchSchema.index({ brand: 1 });
branchSchema.index({ slug: 1, brand: 1 }, { unique: true });
branchSchema.index({ "name.$**": 1 });
branchSchema.index({ status: 1 });
// One main branch per brand is enforced in the service layer (Mongoose can't
// express "unique when isMainBranch=true" as a plain index without a partial
// filter that breaks on the false case for every other branch).
branchSchema.index(
  { brand: 1, isMainBranch: 1 },
  { unique: true, partialFilterExpression: { isMainBranch: true } },
);

const Branch: Model<IBranch> = mongoose.model<IBranch>("Branch", branchSchema);

export default Branch;
