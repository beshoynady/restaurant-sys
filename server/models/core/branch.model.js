import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;
const { Schema } = mongoose;

/**
 * Branch Schema
 * Represents a branch of a brand with multilingual names and addresses,
 * working hours, payments, features, and other details.
 */
const branchSchema = mongoose.Schema(
  {
    // Relation to Brand
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },

    // Branch Name (multi-language, must match Brand menuLanguages)
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

    /*
    slug for URL and internal references (auto-generated from English name)
    */
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      required: true,
      match: /^[a-z]+(?:-[a-z0-9]+)*$/, // allows lowercase letters and hyphens and numbers, but must start with a letter
    },

    // Address (multi-language, must match Brand menuLanguages)
    address: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          country: { type: String, required: true, trim: true, maxlength: 100 },
          stateOrProvince: { type: String, trim: true, maxlength: 100 },
          city: { type: String, required: true, trim: true, maxlength: 100 },
          area: { type: String, trim: true, maxlength: 100 },
          street: { type: String, trim: true, maxlength: 150 },
          buildingNumber: { type: String, trim: true, maxlength: 20 },
          floor: { type: String, trim: true, maxlength: 10 },
          landmark: { type: String, trim: true, maxlength: 150 },
        },
      },
    ],

    postalCode: { type: String, trim: true, maxlength: 20 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },

    // Branch main status
    isMainBranch: { type: Boolean, default: false },

    // Tax Identification Number
    taxIdentificationNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "under_maintenance"],
      default: "active",
    },
    // Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },

    // Soft delete
    deletedBy: { type: ObjectId, ref: "UserAccount" },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// 🔹 Indexes for performance
branchSchema.index(
  { brand: 1 },
  { unique: true, partialFilterExpression: { isMainBranch: true } },
);
branchSchema.index({ slug: 1, brand: 1 }, { unique: true });
branchSchema.index({ "name.$**": 1 });
branchSchema.index({ status: 1 });

const BranchModel = mongoose.model("Branch", branchSchema);
export default BranchModel;
