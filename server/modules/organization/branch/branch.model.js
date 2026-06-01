import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;
const { Schema } = mongoose;

const branchSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
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

    address: {
      type: Map,
      of: {
        country: String,
        city: String,
        area: String,
        street: String,
      },
    },

    // 🔥 GEO LOCATION (Google Maps)
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
    // manager reference for branch-level management and permissions 
    manager: {
      type: ObjectId,
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

    createdBy: { type: ObjectId, ref: "UserAccount" },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
    deletedBy: { type: ObjectId, ref: "UserAccount" },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

// 🔥 GEO INDEX (IMPORTANT)
branchSchema.index({ location: "2dsphere" });

branchSchema.index({ brand: 1 });
branchSchema.index({ slug: 1, brand: 1 }, { unique: true });
branchSchema.index({ "name.$**": 1 });
branchSchema.index({ status: 1 });

export default mongoose.model("Branch", branchSchema);
