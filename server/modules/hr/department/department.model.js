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
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // allows lowercase letters and hyphens and numbers, but must start with a letter
    },
    // Unique Dine-in code (for integrations or reporting)
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
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
      required: true,
      default: "service",
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 50,
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

    isSystemRole: { type: Boolean, default: false },// that created by the system and can update or delete

    // Audit fields
    createdBy: { type: ObjectId, ref: "UserAccount", default: null }, // default null to allow for system-created departments
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

// `sparse: true` on a COMPOUND index only excludes a document missing ALL
// indexed fields, not just `code` — since `brand` is always present, two
// departments in the same brand with no `code` both index as
// {brand, code: null} and collide (confirmed empirically —
// HR_TECHNICAL_DEBT.md HD-004). A partialFilterExpression that only
// indexes documents where `code` actually exists is the correct pattern.
departmentSchema.index(
  { brand: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $exists: true, $type: "string" } } },
);
departmentSchema.index({ slug: 1, brand: 1 }, { unique: true });

const Department = mongoose.model("Department", departmentSchema);

export default Department;
