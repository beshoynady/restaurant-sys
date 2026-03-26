import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const departmentSchema = new mongoose.Schema(
  {
    // The brand that owns this department
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: [true, "Brand reference is required"],
    },

    // All branches where this department exists
    branches: [
      {
        type: ObjectId,
        ref: "Branch",
      },
    ],
    // Multilingual department name
    name: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 1000,
           },
},

    ],
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      required: true,
      match: /^[a-z]+(?:-[a-z0-9]+)*$/, // allows lowercase letters and hyphens and numbers, but must start with a letter
    },
    // Unique Dine-in code (for integrations or reporting)
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, "Department code must be at most 20 characters long"],
    },

    // Description (multilingual)
    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        maxlength: 300,
      },
    },

    // Classification type (food prep, service, admin, etc.)
    classification: {
      type: String,
      enum: [
        "preparation", // preparation (kitchen staff)
        "service", // service (waiters, cashiers)
        "management", // management
        "support", // support (cleaning, maintenance)
        "delivery", // delivery
        "security", // security
      ],
      required: [true, "Department classification is required"],
      default: "service",
      trim: true,
      minlength: [2, "Classification must be at least 2 characters long"],
      maxlength: [50, "Classification must be at most 50 characters long"],
    },

    // Optional parent department (for hierarchical structures)
    parentDepartment: {
      type: ObjectId,
      ref: "Department",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

departmentSchema.index({ brand: 1, code: 1 }, { unique: true, sparse: true });
departmentSchema.index({ slug: 1, brand: 1 }, { unique: true });

const Department = mongoose.model("Department", departmentSchema);

export default Department;
